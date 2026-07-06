"use client";

import { FormEvent, useState } from "react";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

const EXAMPLES = [
  "https://www.tiktok.com/@username/video/1234567890123456789",
];

export default function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const [value, setValue] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (value.trim()) onSubmit(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="flex">
        <input
          type="url"
          required
          placeholder={EXAMPLES[0]}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 min-w-0 rounded-l-xl border-2 border-r-0 border-[#111] px-4 py-3 text-[13.5px] font-mono text-[#111] placeholder:text-[#aaa] outline-none bg-white"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="shrink-0 rounded-r-xl border-2 border-[#111] bg-[#111] text-white px-6 py-3 font-display font-bold text-[14.5px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:enabled:bg-[var(--accent)] hover:enabled:border-[var(--accent)]"
        >
          {isLoading ? "Analyzing…" : "Get my score →"}
        </button>
      </div>
      <p className="mt-2.5 text-[13px] text-[#888]">
        No login. Nothing you submit is stored on a server.
      </p>
    </form>
  );
}
