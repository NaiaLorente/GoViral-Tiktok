import type { ComparisonResult } from "@/lib/analyze";

export default function CompareSummary({ comparison }: { comparison: ComparisonResult }) {
  return (
    <div className="w-full max-w-2xl rounded-2xl border-2 border-[#111] p-6">
      <p className="text-center text-[#111] font-medium mb-5">{comparison.summary}</p>
      <div className="space-y-4">
        {comparison.categories.map((category) => (
          <div key={category.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <div
              className="text-right font-semibold"
              style={{ color: category.winner === "a" ? "#00895a" : "#999" }}
            >
              {category.aScore}/{category.max}
            </div>
            <div className="text-[#999] text-xs uppercase tracking-wide px-2 text-center">
              {category.label}
            </div>
            <div
              className="text-left font-semibold"
              style={{ color: category.winner === "b" ? "#00895a" : "#999" }}
            >
              {category.bScore}/{category.max}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-center text-xs text-[#999] font-mono">
        <div>Video A</div>
        <div>Video B</div>
      </div>
    </div>
  );
}
