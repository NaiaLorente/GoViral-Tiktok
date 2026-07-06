"use client";

// Shared localStorage keys for BYOK provider/API-key state — used by both
// the Analyze page (tailored feedback) and the Ideate page, so a key
// entered once carries over to the other.

import type { LLMProvider } from "@/lib/providers";

export const PROVIDER_STORAGE_KEY = "viralscore_llm_provider";
export const keyStorageKey = (provider: LLMProvider) => `viralscore_llm_key_${provider}`;
export const OLLAMA_BASE_URL_STORAGE_KEY = "viralscore_ollama_base_url";
export const OLLAMA_MODEL_STORAGE_KEY = "viralscore_ollama_model";

export const VALID_PROVIDERS: LLMProvider[] = ["claude", "openai", "gemini", "groq", "ollama"];
