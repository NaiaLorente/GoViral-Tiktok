import type { LLMProvider } from "@/lib/providers";

const PROVIDER_INFO: Record<Exclude<LLMProvider, "ollama">, { label: string; keyUrl: string; note: string }> = {
  gemini: { label: "Gemini (Google)", keyUrl: "https://aistudio.google.com/apikey", note: "genuinely free tier" },
  groq: { label: "Groq", keyUrl: "https://console.groq.com/keys", note: "genuinely free tier" },
  claude: { label: "Claude (Anthropic)", keyUrl: "https://console.anthropic.com/settings/keys", note: "paid" },
  openai: { label: "OpenAI", keyUrl: "https://platform.openai.com/api-keys", note: "paid" },
};

interface ProviderKeyInputProps {
  provider: LLMProvider;
  apiKey: string;
  onProviderChange: (provider: LLMProvider) => void;
  onApiKeyChange: (key: string) => void;
  ollamaBaseUrl: string;
  ollamaModel: string;
  onOllamaBaseUrlChange: (url: string) => void;
  onOllamaModelChange: (model: string) => void;
  /** Short black pill label, e.g. "OPTIONAL" or "BYOK". */
  badgeLabel: string;
  /** One-line explanation shown next to the badge. */
  description: string;
}

export default function ProviderKeyInput({
  provider,
  apiKey,
  onProviderChange,
  onApiKeyChange,
  ollamaBaseUrl,
  ollamaModel,
  onOllamaBaseUrlChange,
  onOllamaModelChange,
  badgeLabel,
  description,
}: ProviderKeyInputProps) {
  const inputClass =
    "rounded-[10px] border-2 border-[#111] px-3.5 py-2.5 text-[13.5px] text-[#111] outline-none bg-white placeholder:text-[#aaa]";

  return (
    <div className="w-full rounded-2xl border-2 border-[#111] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3.5 flex-wrap">
        <span className="font-display font-bold text-[12px] bg-[#111] text-white px-3 py-1 rounded-lg shrink-0">
          {badgeLabel}
        </span>
        <span className="text-[14px] text-[#333] flex-1 min-w-[220px]">{description}</span>
        <select
          value={provider}
          onChange={(e) => onProviderChange(e.target.value as LLMProvider)}
          className={inputClass}
        >
          <option value="gemini">Gemini — free tier</option>
          <option value="groq">Groq — free tier (not Grok/xAI)</option>
          <option value="ollama">Ollama — local, free</option>
          <option value="claude">Claude</option>
          <option value="openai">OpenAI</option>
        </select>

        {provider === "ollama" ? (
          <input
            value={ollamaModel}
            onChange={(e) => onOllamaModelChange(e.target.value)}
            placeholder="model, e.g. llama3.2"
            className={`${inputClass} min-w-[160px]`}
          />
        ) : (
          <input
            type="password"
            placeholder="API key"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            autoComplete="off"
            className={`${inputClass} min-w-[160px]`}
          />
        )}
      </div>

      {provider === "ollama" ? (
        <>
          <input
            value={ollamaBaseUrl}
            onChange={(e) => onOllamaBaseUrlChange(e.target.value)}
            placeholder="http://localhost:11434"
            className={`${inputClass} w-full`}
          />
          <p className="text-xs text-[#888] leading-relaxed">
            Ollama runs entirely on your machine — nothing is sent to us or anyone else. Requires{" "}
            <a href="https://ollama.com/download" target="_blank" rel="noreferrer" className="font-semibold underline" style={{ color: "var(--accent)" }}>
              Ollama installed and running
            </a>{" "}
            with a model already pulled (<code className="text-[#555]">ollama pull llama3.2</code>). If requests
            fail from this hosted page, start Ollama with an <code className="text-[#555]">OLLAMA_ORIGINS</code>{" "}
            value that allows this site.
          </p>
        </>
      ) : (
        <p className="text-xs text-[#888] leading-relaxed">
          Your key stays in your browser and is sent straight through to {PROVIDER_INFO[provider].label} to
          generate results — we never log or store it.{" "}
          <a
            href={PROVIDER_INFO[provider].keyUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
            style={{ color: "var(--accent)" }}
          >
            Get a {PROVIDER_INFO[provider].label} key ({PROVIDER_INFO[provider].note}) →
          </a>
        </p>
      )}
    </div>
  );
}
