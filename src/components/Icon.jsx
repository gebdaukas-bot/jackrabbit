// Simple line icons drawn in the current text color, so they follow the theme
// and the active/inactive tab color (emoji render differently on every phone).
const PATHS = {
  board: <><path d="M5 20V11" /><path d="M12 20V4" /><path d="M19 20v-7" /></>,
  flag: <><path d="M6 21V4" /><path d="M6 4h11l-2.5 4L17 12H6" /></>,
  sliders: <><path d="M4 7h9" /><path d="M17 7h3" /><circle cx="15" cy="7" r="2" /><path d="M4 17h3" /><path d="M11 17h9" /><circle cx="9" cy="17" r="2" /></>,
  card: <><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M8 8.5h8" /><path d="M8 12.5h8" /><path d="M8 16.5h5" /></>,
};

export default function Icon({ name, size = 16, strokeWidth = 2, style }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
      {PATHS[name]}
    </svg>
  );
}

// The Dormie mark: a golf ball asleep on its tee (dormie, dormir), on a navy
// badge — the same art as the app icon (assets/icon.svg).
export function DormieMark({ size = 22 }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 240 240" style={{ flexShrink: 0 }}>
      <rect width="240" height="240" rx="54" fill="#0B1530" />
      <path d="M96 178h48l-8 22h-32z" fill="#C9A24B" />
      <rect x="114" y="170" width="12" height="12" fill="#C9A24B" />
      <circle cx="120" cy="118" r="62" fill="#F6F1E3" />
      <path d="M92 120q10 10 20 0M130 120q10 10 20 0" stroke="#0B1530" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M122 138q6 5 12 0" stroke="#0B1530" strokeWidth="4" fill="none" strokeLinecap="round" />
      <g fill="#C9A24B" fontFamily="Georgia, serif" fontWeight="700">
        <text x="172" y="62" fontSize="30">z</text>
        <text x="192" y="40" fontSize="22">z</text>
      </g>
    </svg>
  );
}
