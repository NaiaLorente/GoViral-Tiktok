import type { BoostAction } from "@/lib/boost";

export default function BoostPanel({ actions }: { actions: BoostAction[] }) {
  if (actions.length === 0) {
    return (
      <div
        className="w-full max-w-xl rounded-2xl border-2 border-[#111] p-5 text-center"
        style={{ background: "color-mix(in srgb, #00c853 10%, white)" }}
      >
        <p className="text-sm text-[#111]">
          ✓ Nothing obvious left to fix on this post — the checks below are all optimizing for next time.
        </p>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-xl rounded-2xl border-2 border-[#111] p-6"
      style={{ background: "color-mix(in srgb, var(--accent2) 12%, white)" }}
    >
      <p className="font-display font-extrabold text-[16px] text-[#111] mb-1">Boost this video now</p>
      <p className="text-[13px] text-[#555] mb-4">Things you can still do to this exact post — no reshoot needed.</p>
      <ul className="flex flex-col gap-3">
        {actions.map((a) => (
          <li key={a.id} className="flex gap-2.5 text-[14px] text-[#222] leading-relaxed">
            <span aria-hidden className="shrink-0">
              {a.icon}
            </span>
            <span>{a.action}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
