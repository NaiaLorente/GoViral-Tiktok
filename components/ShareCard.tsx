"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisResult } from "@/lib/analyze";
import { renderShareCard, canvasToBlob } from "@/lib/shareCard";

export default function ShareCard({
  result,
  handle,
}: {
  result: AnalysisResult;
  handle: string;
}) {
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  useEffect(() => {
    const canvas = renderShareCard(result, handle);
    canvasToBlob(canvas).then(setBlob);

    const preview = previewRef.current;
    if (preview) {
      const ctx = preview.getContext("2d");
      preview.width = canvas.width;
      preview.height = canvas.height;
      ctx?.drawImage(canvas, 0, 0);
    }
  }, [result, handle]);

  function handleDownload() {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "viral-score.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    if (!blob) return;
    const file = new File([blob], "viral-score.png", { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "My TikTok Viral Score" });
      } catch {
        // user cancelled share sheet — no action needed
      }
    } else {
      handleDownload();
    }
  }

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-4">
      <canvas
        ref={previewRef}
        className="w-full max-w-[280px] rounded-xl border-2 border-[#111]"
      />
      <div className="flex gap-3">
        <button
          onClick={handleShare}
          className="rounded-xl border-2 border-[#111] bg-[#111] text-white px-5 py-2.5 font-display font-bold text-[14px] hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-colors"
        >
          Share my score
        </button>
        <button
          onClick={handleDownload}
          className="rounded-xl border-2 border-[#111] px-5 py-2.5 font-display font-bold text-[14px] text-[#111] hover:bg-[#f2f2f2] transition-colors"
        >
          Download PNG
        </button>
      </div>
    </div>
  );
}
