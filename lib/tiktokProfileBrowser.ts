import type { Browser } from "puppeteer-core";

// Vercel Hobby has a hard 10s function timeout with no override — this
// internal deadline leaves a buffer for Chromium launch/teardown overhead
// and the rest of the route handler, so we can return a graceful fallback
// instead of getting hard-killed mid-request.
const HARD_DEADLINE_MS = 7500;
const NAV_TIMEOUT_MS = 5500;
const SETTLE_DELAY_MS = 1200;

export interface BrowserFetchResult {
  html: string;
  apiResponses: unknown[];
}

/**
 * @sparticuz/chromium ships a Lambda/Vercel-compatible Chromium binary and
 * is only meant for that environment — it won't run via a normal local
 * `npm run dev`. Locally, fall back to full `puppeteer`, which downloads a
 * matching Chromium build for the developer's own OS at install time.
 *
 * Both paths are wrapped with puppeteer-extra-plugin-stealth: a real
 * account (129M followers) tested via headless browser from a residential
 * IP still only returned bio/follower count, which points at TikTok
 * detecting Puppeteer-controlled Chromium itself (navigator.webdriver,
 * missing browser internals, etc.) rather than IP reputation. Stealth
 * patches the known fingerprints bot detection commonly checks for — it's
 * not a guaranteed fix, but a genuinely different lever than anything
 * tried so far.
 */
async function launchBrowser(): Promise<Browser> {
  const isServerless = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  const { addExtra } = await import("puppeteer-extra");
  const StealthPlugin = (await import("puppeteer-extra-plugin-stealth")).default;

  if (isServerless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = await import("puppeteer-core");
    // puppeteer-extra's types still expect the long-removed
    // createBrowserFetcher method — a typing gap, not a real incompatibility.
    const puppeteer = addExtra(puppeteerCore as unknown as Parameters<typeof addExtra>[0]);
    puppeteer.use(StealthPlugin());
    const browser = await puppeteer.launch({
      args: [...chromium.args, "--disable-gpu", "--disable-dev-shm-usage"],
      defaultViewport: { width: 800, height: 600 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    return browser as unknown as Browser;
  }

  const puppeteerFull = await import("puppeteer");
  const puppeteer = addExtra(puppeteerFull as unknown as Parameters<typeof addExtra>[0]);
  puppeteer.use(StealthPlugin());
  const browser = await puppeteer.launch({
    headless: true,
    // Harmless on a normal local dev machine; required in CI/Docker/root
    // environments where Chrome's sandbox can't initialize.
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  // puppeteer (full) wraps puppeteer-core internally and is structurally
  // identical here — this cast just reconciles the two packages' nominal types.
  return browser as unknown as Browser;
}

async function renderProfile(browser: Browser, url: string): Promise<BrowserFetchResult> {
  const page = await browser.newPage();
  const apiResponses: unknown[] = [];

  // Blocking heavy assets (images/video thumbnails/fonts) is the single
  // biggest speed win here — TikTok profile pages are asset-heavy, and we
  // only need the HTML/JS/XHR traffic to get real data.
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const type = req.resourceType();
    if (type === "image" || type === "font" || type === "media" || type === "stylesheet") {
      req.abort();
    } else {
      req.continue();
    }
  });

  page.on("response", (res) => {
    const resUrl = res.url();
    if (resUrl.includes("/api/post/item_list") || resUrl.includes("/api/user/detail")) {
      res
        .json()
        .then((json) => apiResponses.push(json))
        .catch(() => {
          // Not JSON, or the body was already consumed — ignore.
        });
    }
  });

  await page
    .goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS })
    .catch(() => {
      // A timed-out/partial navigation may still have produced a usable DOM
      // or intercepted API responses — keep going rather than aborting.
    });

  await new Promise((resolve) => setTimeout(resolve, SETTLE_DELAY_MS));

  const html = await page.content().catch(() => "");
  return { html, apiResponses };
}

export async function fetchProfileViaBrowser(url: string): Promise<BrowserFetchResult> {
  // The deadline has to cover launch too, not just rendering — a slow cold
  // start (decompressing/launching Chromium) eats into the same 10s budget
  // just as much as a slow page load does.
  let browser: Browser | null = null;
  try {
    return await Promise.race([
      (async () => {
        browser = await launchBrowser();
        return renderProfile(browser, url);
      })(),
      new Promise<BrowserFetchResult>((_, reject) =>
        setTimeout(() => reject(new Error("Browser operation exceeded internal deadline")), HARD_DEADLINE_MS)
      ),
    ]);
  } finally {
    if (browser) await (browser as Browser).close().catch(() => {});
  }
}
