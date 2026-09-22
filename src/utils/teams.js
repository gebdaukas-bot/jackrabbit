// Team model.
//
// A cup has 2–4 teams. Every *match* is still played between exactly two sides,
// "A" and "B" — that's what per-hole scores ("A" | "B" | "H") and
// computeMatchStatus() mean, and it never changes. What the 4-team support adds
// is that which team sits on side A and which on side B varies per match:
// match.teamA / match.teamB hold team ids. A match with those fields missing is
// a legacy two-team match, so it defaults to teams[0] vs teams[1].
//
// Legacy cups have no meta.teams at all — just teamAName/teamBName/teamAColor/…
// getTeams() synthesizes the array from those, so old cups read correctly with
// no migration and no re-seeding.

export const MAX_TEAMS = 4;
export const TEAM_IDS = ["A", "B", "C", "D"];

// Default fill colors for teams 1–4. The first two match the long-standing
// red/navy defaults so existing cups keep the exact colors they had.
export const DEFAULT_TEAM_COLORS = ["#C8102E", "#003087", "#1B5E20", "#E65100"];
// Navy renders too dark for small text on the dark board, so team B's *default*
// has a lighter display variant. A color the user actually picked is used as-is.
const DEFAULT_DISP_COLORS = ["#C8102E", "#4A90D9", "#2E7D32", "#F57F17"];

export const DEFAULT_TEAM_NAMES = ["Team A", "Team B", "Team C", "Team D"];

// Initials of the team name, e.g. "Gabby's Interns" -> "GI". Falls back to the
// team id when a name is blank.
export function autoShort(name, fallback = "") {
  const s = (name || "").split(/\s+/).filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 6);
  return s || fallback;
}

function normalizeTeam(t, i) {
  const id = t?.id || TEAM_IDS[i] || `T${i + 1}`;
  const name = t?.name || DEFAULT_TEAM_NAMES[i] || `Team ${i + 1}`;
  const color = t?.color || DEFAULT_TEAM_COLORS[i] || "#555";
  return {
    id,
    name,
    short: t?.short || autoShort(name, id),
    // Whether the short was derived rather than chosen — derived ones get
    // adjusted on a collision, a name the organiser typed never does.
    autoShort: !t?.short,
    color,
    // colorDisp is the color used for text/accents. It only differs from color
    // when the team is on a default (see DEFAULT_DISP_COLORS).
    colorDisp: t?.color || DEFAULT_DISP_COLORS[i] || color,
  };
}

// Two teams easily share initials — "Green Team" and "Gold Team" both give "GT" —
// and the short name is what the match cards and board show. Any *derived* short
// that collides falls back to the start of the name, then to the team id.
function dedupeShorts(list) {
  const taken = new Set(list.filter(t => !t.autoShort).map(t => t.short));
  return list.map(t => {
    if (!t.autoShort) return t;
    const candidates = [t.short, t.name.replace(/\s+/g, "").slice(0, 4).toUpperCase(), t.id];
    for (const c of candidates) {
      if (c && !taken.has(c)) { taken.add(c); return { ...t, short: c }; }
    }
    return { ...t, short: t.id };
  });
}

// The cup's teams, newest shape first, falling back to the legacy two-team fields.
export function getTeams(meta) {
  const raw = meta?.teams;
  const arr = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw) : null;
  if (arr && arr.length >= 2) return dedupeShorts(arr.slice(0, MAX_TEAMS).map(normalizeTeam));
  return dedupeShorts([
    normalizeTeam({ id: "A", name: meta?.teamAName, short: meta?.teamAShort, color: meta?.teamAColor }, 0),
    normalizeTeam({ id: "B", name: meta?.teamBName, short: meta?.teamBShort, color: meta?.teamBColor }, 1),
  ]);
}

export function teamById(teams, id) {
  return teams.find(t => t.id === id) || null;
}

// The two teams contesting a match: its teamA/teamB ids, or the first two teams
// for a legacy match that predates per-match team assignment.
export function matchTeams(teams, match) {
  return {
    a: teamById(teams, match?.teamA) || teams[0],
    b: teamById(teams, match?.teamB) || teams[1] || teams[0],
  };
}

// The `cup`-shaped color/name bundle that MatchCard, HoleEntry, GroupHoleEntry,
// HcpModal and HoleByHoleTable already consume — but resolved for one specific
// match, so each match is painted in its own two teams' colors.
export function cupSidesFor(teams, match) {
  const { a, b } = matchTeams(teams, match);
  return {
    teamAId: a.id, teamAName: a.name, teamAShort: a.short, teamAColor: a.color, teamAColorDisp: a.colorDisp,
    teamBId: b.id, teamBName: b.name, teamBShort: b.short, teamBColor: b.color, teamBColorDisp: b.colorDisp,
  };
}

// Write shape for meta.teams, plus the legacy teamA*/teamB* mirror so that
// anything still reading the old fields (saved cup lists, older clients) keeps
// showing something sensible for the first two teams.
export function teamsToMeta(teams) {
  const norm = dedupeShorts(teams.slice(0, MAX_TEAMS).map(normalizeTeam));
  return {
    teams: norm.map(t => ({ id: t.id, name: t.name, short: t.short, color: t.color })),
    teamAName: norm[0].name, teamAColor: norm[0].color, teamAShort: norm[0].short,
    teamBName: norm[1].name, teamBColor: norm[1].color, teamBShort: norm[1].short,
  };
}

// Label for a cup in a list: "A vs B" for two teams, "A · B · C · D" beyond that.
export function teamsLabel(teams) {
  const names = teams.map(t => t.name);
  return names.length <= 2 ? names.join(" vs ") : names.join(" · ");
}
