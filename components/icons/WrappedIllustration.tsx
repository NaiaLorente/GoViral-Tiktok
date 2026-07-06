/** Decorative overlapping card-stack for the Wrapped hero — original vector art, not a photo/AI image. */
export default function WrappedIllustration() {
  return (
    <svg width="280" height="260" viewBox="0 0 280 260" aria-hidden>
      <rect x="76" y="70" width="150" height="180" rx="20" fill="#111111" transform="rotate(-8 151 160)" />
      <rect x="70" y="60" width="150" height="180" rx="20" fill="var(--accent2)" transform="rotate(4 145 150)" />
      <rect x="65" y="52" width="150" height="180" rx="20" fill="var(--accent)" stroke="#111" strokeWidth="4" />
      <rect x="90" y="80" width="100" height="14" rx="7" fill="#111" opacity="0.85" />
      <rect x="90" y="104" width="70" height="10" rx="5" fill="#111" opacity="0.5" />
      <circle cx="140" cy="175" r="34" fill="#fff" stroke="#111" strokeWidth="4" />
      <path d="M126 175 l10 10 l20 -22" stroke="#111" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="240" cy="46" r="10" fill="var(--accent2)" className="animate-float-y" />
      <rect x="18" y="20" width="24" height="24" rx="6" fill="#111111" className="animate-float-y2" style={{ animationDelay: "0.4s" }} />
      <circle cx="30" cy="220" r="8" fill="var(--accent)" className="animate-bob" />
    </svg>
  );
}
