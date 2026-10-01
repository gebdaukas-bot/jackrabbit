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

// Team colors are also used as text. A pale one (fine on the dark theme) is unreadable
// on the light theme's white cards, so there it's deepened: same hue, lower lightness.
export function inkOnLight(hex) {
  if (!hex || contrastText(hex) !== "#0d1929") return hex; // already dark enough
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (h.length !== 6) return hex;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let hue = 0;
  if (d) hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hue *= 60;
  const l = (max + min) / 2, sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  // Near-greys stay grey; anything with a hue keeps it, made rich enough to read.
  const S = sat < 0.08 ? sat : Math.max(sat, 0.55), L = 0.36;
  const c = (1 - Math.abs(2 * L - 1)) * S, x = c * (1 - Math.abs((hue / 60) % 2 - 1)), m = L - c / 2;
  const [R, G, B] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [R, G, B].map(v => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}
