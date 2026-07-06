/** Black square mark with a small "play" triangle in the accent2 color, matching the nav mark in the flat-editorial redesign. */
export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect width="28" height="28" rx="8" fill="#111111" />
      <path d="M11 8.5 L20 14 L11 19.5 Z" fill="var(--accent2)" />
    </svg>
  );
}
