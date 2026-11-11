// Longest drive and closest to the pin: one of each can be set per round (on the
// round as `contests: { ld: holeIdx, ctp: holeIdx }`), and the current leader of
// each lives at cups/{id}/contests/{key}:
//   { type: "ld" | "ctp", dayIdx, roundIdx, hole, name, team, inches (ctp only), at }
// Groups reporting a new leader overwrite it; `at` changes with every new leader,
// which is what lets each one be announced once (see cupEvents).

export const CONTEST_LABEL = { ld: "Longest drive", ctp: "Closest to the pin" };

export const contestKey = (dayIdx, roundIdx, type) => `d${dayIdx}r${roundIdx}-${type}`;

// The contests on this hole of this round, in the order they're asked about.
export function contestsOnHole(round, hole) {
  const c = round?.contests || {};
  return ["ld", "ctp"].filter(t => c[t] != null && Number(c[t]) === hole);
}

// 100 inches → 8′ 4″
export function fmtFeet(inches) {
  const n = Math.round(Number(inches) || 0);
  return `${Math.floor(n / 12)}′ ${n % 12}″`;
}
