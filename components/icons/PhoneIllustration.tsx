/** Decorative phone mockup for the Analyze hero — original vector art, not a photo/AI image. */
export default function PhoneIllustration() {
  return (
    <svg width="280" height="270" viewBox="0 0 300 290" aria-hidden>
      <rect x="60" y="10" width="150" height="270" rx="24" fill="#111111" />
      <rect x="70" y="30" width="130" height="230" rx="6" fill="var(--accent)" />
      <rect x="82" y="46" width="70" height="10" rx="5" fill="#fff" opacity="0.9" />
      <rect x="82" y="64" width="106" height="8" rx="4" fill="#fff" opacity="0.5" />
      <circle cx="176" cy="200" r="18" fill="var(--accent2)" className="animate-bob" />
      <path d="M170 200 l5 5 l9 -11" stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="30" cy="60" r="14" fill="var(--accent2)" className="animate-float-y2" />
      <rect x="240" y="230" width="30" height="30" rx="8" fill="#111111" className="animate-float-y2" style={{ animationDelay: "0.8s" }} />
      <circle cx="258" cy="60" r="8" fill="var(--accent)" className="animate-float-y" />
    </svg>
  );
}
