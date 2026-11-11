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

// The Dormie mark: a pin flag, for headers where the ⛳ emoji used to be.
export function DormieMark({ size = 22 }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <ellipse cx="12" cy="20.5" rx="7" ry="1.8" fill="var(--glow)" stroke="#C4A44A" strokeWidth="1" opacity="0.9" />
      <path d="M8 20.5V3" stroke="#C4A44A" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 3.5h9l-2.2 3.5L17 10.5H8z" fill="#C4A44A" />
    </svg>
  );
}
