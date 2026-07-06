import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Puppeteer/Chromium ship native binaries and large assets that Next's
  // bundler shouldn't try to trace/tree-shake — keep them as plain
  // require()s in the serverless function instead.
  serverExternalPackages: [
    "puppeteer-core",
    "@sparticuz/chromium",
    "puppeteer",
    "puppeteer-extra",
    "puppeteer-extra-plugin-stealth",
  ],
};

export default nextConfig;
