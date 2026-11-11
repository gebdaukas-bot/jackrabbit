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

// The Dormie mark: a bold D with a pin flag standing in its counter — the same
// art as the app icon (assets/icon.svg).
export function DormieMark({ size = 22 }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      <defs><linearGradient id="dormie-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F0D888" /><stop offset="1" stopColor="#B8913A" /></linearGradient></defs>
      <path fill="url(#dormie-gold)" fillRule="evenodd" d="M14 10 H46 A40 40 0 0 1 46 90 H14 Z M30 25 H45 A25 25 0 0 1 45 75 H30 Z" />
      <rect x="41.5" y="34" width="3.6" height="33" rx="1.8" fill="url(#dormie-gold)" />
      <path d="M45 34.5 L60 40.5 L45 46.5 Z" fill="url(#dormie-gold)" />
      <ellipse cx="43.3" cy="67.5" rx="7.5" ry="2" fill="url(#dormie-gold)" opacity="0.55" />
    </svg>
  );
}
