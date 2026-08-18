// Picks readable text color for a given background color, so a team color that's set to
// white (or any other light color) doesn't render white-on-white/light-on-light text.
export function contrastText(hex, { dark = "#0d1929", light = "#ffffff" } = {}) {
  if (!hex) return light;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (h.length !== 6) return light;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return light;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? dark : light;
}
