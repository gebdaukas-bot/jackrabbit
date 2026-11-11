// The page backdrop behind every screen: a flat ground with a soft glow at the
// top, kept quiet so scores and team colors carry the page.
export default function LiveBackground() {
  return (
    <div aria-hidden style={{
      position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none",
      background: "radial-gradient(120% 60% at 50% -10%, var(--glow) 0%, transparent 60%), var(--bg)",
    }} />
  );
}
