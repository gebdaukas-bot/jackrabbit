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

function toHsl(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (h.length !== 6) return null;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  if ([r, g, b].some(Number.isNaN)) return null;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let hue = 0;
  if (d) hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const l = (max + min) / 2;
  return { hue: (hue * 60 + 360) % 360, sat: d ? d / (1 - Math.abs(2 * l - 1)) : 0, l };
}

function fromHsl(hue, S, L) {
  const c = (1 - Math.abs(2 * L - 1)) * S, x = c * (1 - Math.abs((hue / 60) % 2 - 1)), m = L - c / 2;
  const [R, G, B] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [R, G, B].map(v => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}

// Team colors are also used as text. A pale one (fine on the dark theme) is unreadable
// on the light theme's white cards, so there it's deepened: same hue, lower lightness.
export function inkOnLight(hex) {
  if (!hex || contrastText(hex) !== "#0d1929") return hex; // already dark enough
  const c = toHsl(hex);
  if (!c) return hex;
  // Near-greys stay grey; anything with a hue keeps it, made rich enough to read.
  return fromHsl(c.hue, c.sat < 0.08 ? c.sat : Math.max(c.sat, 0.55), 0.36);
}

// The reverse on the dark theme: a deep color (navy, black) disappears on the dark
// background, so it's lifted; colors that already read fine are left alone. Greys are lifted on a sliding scale rather than to one
// floor, so a Black team and a Grey team still read as two different shades.
export function inkOnDark(hex) {
  const c = hex && toHsl(hex);
  if (!c) return hex;
  if (c.sat < 0.08) return c.l >= 0.9 ? hex : fromHsl(c.hue, c.sat, 0.5 + 0.45 * c.l);
  return luminance(hex) >= 0.1 ? hex : fromHsl(c.hue, Math.min(c.sat, 0.8), 0.62);
}

// WCAG relative luminance (0 black – 1 white). Below ~0.1 a color is too dim to read
// as text on the dark theme's navy background.
function luminance(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const [r, g, b] = [0, 2, 4].map(i => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
