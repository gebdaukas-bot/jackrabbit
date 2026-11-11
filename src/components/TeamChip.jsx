// A small swatch of a team's color, shown beside its name so teams aren't told
// apart by text color alone (a thin outline keeps black or navy visible on dark).
export default function TeamChip({ color, size = 8, style }) {
  return <span aria-hidden style={{ display: "inline-block", width: size, height: size, borderRadius: 2, background: color, boxShadow: "0 0 0 1px rgba(255,255,255,0.35)", verticalAlign: "middle", flexShrink: 0, ...style }} />;
}
