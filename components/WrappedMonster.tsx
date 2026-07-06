import type { MonsterFlags } from "@/lib/wrappedPersona";

/** Renders the persona mascot as SVG — flags fully determine which parts show, so this and lib/wrappedMonsterCanvas.ts (the share-card equivalent) can never visually drift apart. */
export default function WrappedMonster({ flags, size = 130 }: { flags: MonsterFlags; size?: number }) {
  const { bodyColor, bellyColor } = flags;

  return (
    <svg width={size} height={size} viewBox="0 0 160 160">
      <ellipse cx="80" cy="140" rx="40" ry="8" fill="#000" opacity="0.12" />
      <ellipse cx="55" cy="132" rx="12" ry="7" fill={bodyColor} stroke="#111" strokeWidth="3" />
      <ellipse cx="105" cy="132" rx="12" ry="7" fill={bodyColor} stroke="#111" strokeWidth="3" />

      {flags.armsDefault && (
        <>
          <circle cx="18" cy="96" r="11" fill={bodyColor} stroke="#111" strokeWidth="3" />
          <circle cx="142" cy="96" r="11" fill={bodyColor} stroke="#111" strokeWidth="3" />
        </>
      )}
      {flags.armsCrossed && (
        <>
          <path d="M38 96 Q70 116 102 96" stroke="#111" strokeWidth="14" fill="none" strokeLinecap="round" />
          <path d="M38 96 Q70 116 102 96" stroke={bodyColor} strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M122 96 Q90 116 58 96" stroke="#111" strokeWidth="14" fill="none" strokeLinecap="round" />
          <path d="M122 96 Q90 116 58 96" stroke={bodyColor} strokeWidth="9" fill="none" strokeLinecap="round" />
        </>
      )}
      {flags.armsPointing && (
        <>
          <circle cx="18" cy="96" r="11" fill={bodyColor} stroke="#111" strokeWidth="3" />
          <path d="M128 96 Q148 84 146 54" stroke="#111" strokeWidth="13" fill="none" strokeLinecap="round" />
          <path d="M128 96 Q148 84 146 54" stroke={bodyColor} strokeWidth="9" fill="none" strokeLinecap="round" />
          <circle cx="146" cy="48" r="9" fill={bodyColor} stroke="#111" strokeWidth="3" />
        </>
      )}
      {flags.armsCupped && (
        <>
          <ellipse cx="48" cy="100" rx="9" ry="7" fill={bodyColor} stroke="#111" strokeWidth="3" />
          <ellipse cx="112" cy="100" rx="9" ry="7" fill={bodyColor} stroke="#111" strokeWidth="3" />
        </>
      )}

      <ellipse cx="80" cy="88" rx="58" ry="50" fill={bodyColor} stroke="#111" strokeWidth="4" />
      <ellipse cx="80" cy="100" rx="32" ry="27" fill={bellyColor} opacity="0.9" />
      <ellipse cx="46" cy="92" rx="8" ry="5" fill="#ff8fa3" opacity="0.55" />
      <ellipse cx="114" cy="92" rx="8" ry="5" fill="#ff8fa3" opacity="0.55" />

      {flags.beltPatches &&
        flags.patches.map((patch, i) => (
          <ellipse
            key={i}
            cx={patch.cx}
            cy={patch.cy}
            rx={patch.rx}
            ry={patch.ry}
            fill={patch.fill}
            opacity="0.9"
            stroke="#111"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        ))}
      {flags.beltBolt && (
        <path
          d="M86 66 L68 98 L80 98 L72 124 L102 88 L86 88 Z"
          fill={bellyColor}
          stroke="#111"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}
      {flags.beltDots && (
        <>
          <circle cx="64" cy="112" r="5" fill="#111" />
          <circle cx="80" cy="112" r="5" fill="#111" />
          <circle cx="96" cy="112" r="5" fill="#111" />
        </>
      )}
      {flags.beltTarget && (
        <>
          <circle cx="80" cy="108" r="16" fill="#fff" stroke="#111" strokeWidth="2.5" />
          <circle cx="80" cy="108" r="10" fill={bodyColor} stroke="#111" strokeWidth="2" />
          <circle cx="80" cy="108" r="4" fill="#111" />
        </>
      )}

      {flags.topAntenna && (
        <>
          <line x1="80" y1="40" x2="80" y2="16" stroke="#111" strokeWidth="4" />
          <circle cx="80" cy="12" r="7" fill={bellyColor} stroke="#111" strokeWidth="3" />
        </>
      )}
      {flags.topHorns && (
        <>
          <path d="M55 42 L46 16 L68 32 Z" fill="#111" />
          <path d="M105 42 L114 16 L92 32 Z" fill="#111" />
        </>
      )}
      {flags.topMohawk && (
        <>
          <path d="M64 38 L68 14 L74 38 Z" fill={bodyColor} stroke="#111" strokeWidth="2" />
          <path d="M74 34 L80 8 L86 34 Z" fill={bodyColor} stroke="#111" strokeWidth="2" />
          <path d="M86 38 L92 14 L96 38 Z" fill={bodyColor} stroke="#111" strokeWidth="2" />
        </>
      )}
      {flags.topPartyHat && (
        <>
          <path d="M62 40 L80 6 L98 40 Z" fill="#7C5CFF" stroke="#111" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="70" cy="30" r="3.5" fill="#fff" />
          <circle cx="84" cy="20" r="3.5" fill="#fff" />
          <circle cx="78" cy="34" r="3" fill="#fff" />
          <circle cx="80" cy="6" r="6" fill="#FFB020" stroke="#111" strokeWidth="2.5" />
        </>
      )}

      {flags.browAngry && (
        <>
          <line x1="46" y1="56" x2="66" y2="64" stroke="#111" strokeWidth="4" strokeLinecap="round" />
          <line x1="114" y1="56" x2="94" y2="64" stroke="#111" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {flags.browRaised && (
        <>
          <path d="M46 54 Q60 44 74 54" stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M86 54 Q100 44 114 54" stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}

      {flags.isTwoEye && (
        <>
          <g style={{ transformOrigin: "60px 74px", animation: "monsterBlink 4.5s ease-in-out infinite" }}>
            <circle cx="60" cy="74" r="15" fill="#fff" stroke="#111" strokeWidth="3" />
            <circle cx="60" cy="77" r="6" fill="#111" />
            <circle cx="58" cy="75" r="2" fill="#fff" />
          </g>
          <g style={{ transformOrigin: "100px 74px", animation: "monsterBlink 4.5s ease-in-out 0.15s infinite" }}>
            <circle cx="100" cy="74" r="15" fill="#fff" stroke="#111" strokeWidth="3" />
            <circle cx="100" cy="77" r="6" fill="#111" />
            <circle cx="98" cy="75" r="2" fill="#fff" />
          </g>
          {flags.hasGlasses && (
            <>
              <rect x="42" y="60" width="36" height="28" rx="9" fill="none" stroke="#111" strokeWidth="4" />
              <rect x="82" y="60" width="36" height="28" rx="9" fill="none" stroke="#111" strokeWidth="4" />
              <line x1="78" y1="74" x2="82" y2="74" stroke="#111" strokeWidth="4" />
              <line x1="42" y1="70" x2="30" y2="66" stroke="#111" strokeWidth="4" strokeLinecap="round" />
              <line x1="118" y1="70" x2="130" y2="66" stroke="#111" strokeWidth="4" strokeLinecap="round" />
            </>
          )}
        </>
      )}
      {flags.isOneEye && (
        <g style={{ transformOrigin: "80px 76px", animation: "monsterBlink 4.5s ease-in-out infinite" }}>
          <circle cx="80" cy="76" r="24" fill="#fff" stroke="#111" strokeWidth="3" />
          <circle cx="80" cy="80" r="10" fill="#111" />
          <circle cx="76" cy="77" r="3" fill="#fff" />
        </g>
      )}
      {flags.isWink && (
        <>
          <path d="M48 76 Q60 84 72 76" stroke="#111" strokeWidth="4" fill="none" strokeLinecap="round" />
          <g style={{ transformOrigin: "100px 74px", animation: "monsterBlink 4.5s ease-in-out infinite" }}>
            <circle cx="100" cy="74" r="15" fill="#fff" stroke="#111" strokeWidth="3" />
            <circle cx="100" cy="77" r="6" fill="#111" />
            <circle cx="98" cy="75" r="2" fill="#fff" />
          </g>
        </>
      )}

      {flags.isSmile && (
        <path d="M62 102 Q80 118 98 102" stroke="#111" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
      {flags.isZigzag && (
        <path
          d="M58 104 L68 114 L78 104 L88 114 L98 104"
          stroke="#111"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {flags.isFlat && <line x1="65" y1="108" x2="95" y2="108" stroke="#111" strokeWidth="4" strokeLinecap="round" />}
      {flags.isOpen && (
        <>
          <ellipse cx="80" cy="108" rx="13" ry="10" fill="#111" />
          <ellipse cx="80" cy="112" rx="7" ry="5" fill="#ff6b81" />
        </>
      )}
      {flags.hasSoundWaves && (
        <>
          <path d="M108 92 Q120 100 108 108" stroke="#111" strokeWidth="2.5" fill="none" />
          <path d="M115 86 Q131 100 115 114" stroke="#111" strokeWidth="2.5" fill="none" opacity="0.6" />
        </>
      )}
      {flags.hasBowtie && (
        <>
          <path d="M80 122 L64 114 L64 130 Z" fill="#111" />
          <path d="M80 122 L96 114 L96 130 Z" fill="#111" />
          <circle cx="80" cy="122" r="5" fill="#FFB020" stroke="#111" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
