/** Decorative "idea assistant" mockup for the Ideate hero — original vector art, not a photo/AI image. */
export default function IdeateIllustration() {
  return (
    <svg width="280" height="260" viewBox="0 0 280 260" aria-hidden>
      <circle cx="140" cy="115" r="78" fill="var(--accent2)" />
      <line x1="140" y1="18" x2="140" y2="34" stroke="#111" strokeWidth="4" strokeLinecap="round" className="animate-pulse-glow" />
      <line x1="86" y1="38" x2="98" y2="50" stroke="#111" strokeWidth="4" strokeLinecap="round" className="animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
      <line x1="194" y1="38" x2="182" y2="50" stroke="#111" strokeWidth="4" strokeLinecap="round" className="animate-pulse-glow" style={{ animationDelay: "0.6s" }} />
      <circle cx="140" cy="98" r="42" fill="#fff" stroke="#111" strokeWidth="4" />
      <path d="M120 134 L160 134 L154 152 L126 152 Z" fill="#fff" stroke="#111" strokeWidth="4" />
      <rect x="126" y="152" width="28" height="9" fill="#111" />
      <rect x="128" y="163" width="24" height="9" fill="#111" />
      <rect x="130" y="174" width="20" height="12" rx="4" fill="#111" />
      <path d="M122 100 L133 84 L140 100 L147 84 L158 100" stroke="var(--accent)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="234" cy="56" r="12" fill="var(--accent)" className="animate-float-y" />
      <rect x="18" y="184" width="26" height="26" rx="7" fill="#111111" className="animate-float-y2" style={{ animationDelay: "0.5s" }} />
      <circle cx="38" cy="64" r="9" fill="#111111" className="animate-bob" />
    </svg>
  );
}
