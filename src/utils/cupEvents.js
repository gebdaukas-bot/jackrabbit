// Push notification content for a cup: which results are worth announcing, and
// what each notification says. Pure functions over the cup's raw database
// sections, shared by api/notify.js (which sends them) and the tests.
import { computeMatchStatus, standings } from "./scoring.js";
import { getTeams, matchTeams } from "./teams.js";
import { fmtFeet } from "./contests.js";

// The cup's days with their matches and scores attached — the same shape
// CupView builds from its listeners, from cups/{id}/days, /matches and /scores.
export function assembleDays(rawDays, rawMatches, rawScores) {
  const dayArr = rawDays ? (Array.isArray(rawDays) ? rawDays : Object.values(rawDays)) : [];
  const days = dayArr.map(d => ({ ...d, rounds: d?.rounds || [{ format: d?.format, course: d?.course }], matches: [] }));
  for (const [key, m] of Object.entries(rawMatches || {})) {
    const num = parseInt(key.replace("m", ""));
    // m${(day+1)*1000 + (round+1)*100 + n}, or the old m${(day+1)*100 + n}.
    const dayIdx = num >= 1000 ? Math.floor(num / 1000) - 1 : Math.floor(num / 100) - 1;
    const roundIdx = num >= 1000 ? Math.floor((num % 1000) / 100) - 1 : 0;
    if (!days[dayIdx]) continue;
    const fb = rawScores?.[key];
    days[dayIdx].matches.push({
      id: num, roundIdx, ...m,
      scores: Array.from({ length: 18 }, (_, i) => fb?.scores?.[i] ?? null),
      extra: fb?.extra ? Object.values(fb.extra) : [],
    });
  }
  for (const d of days) d.matches.sort((a, b) => a.id - b.id);
  return days;
}

const fmt = n => {
  const whole = Math.floor(n);
  return n - whole === 0.5 ? (whole ? `${whole}½` : "½") : String(n);
};
// "Team Blue" reads well in a title, but a standings line is tighter without it.
const bare = name => name.replace(/^team\s+/i, "");

function matchStatus(day, m, a, b) {
  const round = day.rounds?.[m.roundIdx ?? 0] || {};
  return computeMatchStatus(m.scores, a.short, b.short, m.startHole || 0, round.totalHoles || 18,
    round.pointValue ?? 1, round.allowExtraHoles || false, m.extra || []);
}

const isFinished = s => s.state === "complete" || s.state === "halved";

// "Henry & Geb": first names, except where two players in the match share one.
function sideNames(m) {
  const all = [m.player1a, m.player1b, m.player2a, m.player2b].filter(Boolean);
  const first = n => n.trim().split(/\s+/)[0];
  const name = n => (all.filter(o => first(o) === first(n)).length > 1 ? n.trim() : first(n));
  const side = ps => ps.filter(Boolean).map(name).join(" & ");
  return { A: side([m.player1a, m.player1b]), B: side([m.player2a, m.player2b]) };
}

function standingsLine(rows) {
  return rows.map(r => `${bare(r.team.name)} ${fmt(r.actual)}`).join(" · ");
}

// Every announcement the cup's current state calls for, each with a stable key
// so the sender can make sure it only ever goes out once:
//   m####  a match finished    day#  a day's last match finished    clinch  the cup is won
//   c-…    a new longest-drive / closest-to-the-pin leader
export function cupEvents(meta, days, contests = {}) {
  const teams = getTeams(meta);
  const live = meta?.eventType === "live_match";
  const { rows, winner } = standings(days, teams);
  const events = [];

  days.forEach((day, di) => {
    for (const m of day.matches) {
      const { a, b } = matchTeams(teams, m);
      const s = matchStatus(day, m, a, b);
      if (!isFinished(s)) continue;
      const pv = day.rounds?.[m.roundIdx ?? 0]?.pointValue ?? 1;
      const names = sideNames(m);
      let title, body;
      if (s.state === "halved") {
        title = `${a.name} and ${b.name} halve`;
        body = names.A && names.B ? `${names.A} and ${names.B} finish all square` : "Match finishes all square";
        if (!live) body += ` · ${fmt(pv / 2)} point${pv / 2 > 1 ? "s" : ""} each`;
      } else {
        const [w, l] = s.leader === "A" ? [a, b] : [b, a];
        const [wn, ln] = s.leader === "A" ? [names.A, names.B] : [names.B, names.A];
        title = live ? `${w.name} wins` : `${w.name} secured ${pv === 1 ? "a point" : `${fmt(pv)} points`}`;
        body = `${wn || w.name} beat ${ln || l.name} ${s.sublabel.replace("&", " & ")}`;
      }
      // Head-to-head the running score fits on the end; with more teams it
      // waits for the end-of-day standings.
      if (!live && teams.length === 2) body += ` · ${standingsLine(rows)}`;
      events.push({ key: `m${m.id}`, title, body });
    }

    if (live || !day.matches.length) return;
    const done = day.matches.every(m => { const { a, b } = matchTeams(teams, m); return isFinished(matchStatus(day, m, a, b)); });
    if (done) events.push({
      key: `day${di}`,
      title: `${day.label || `Day ${di + 1}`} is in the books`,
      body: standingsLine(standingsAfter(days, teams, di)),
    });
  });

  // A new longest drive or closest to the pin: keyed by when it was set, so each
  // new leader is announced once.
  for (const [k, c] of Object.entries(contests || {})) {
    if (!c?.name || !c.at) continue;
    const team = teams.find(t => t.id === c.team)?.name;
    const who = team ? `${c.name} (${team.replace(/^team\s+/i, "")})` : c.name;
    events.push(c.type === "ctp"
      ? { key: `c-${k}-${c.at}`, title: `🎯 Closest to the pin on ${c.hole + 1}`, body: `${who} takes the lead at ${fmtFeet(c.inches)}` }
      : { key: `c-${k}-${c.at}`, title: `🏌️ New longest drive on ${c.hole + 1}`, body: `${who} takes the lead` });
  }

  if (!live && winner) events.push({
    key: "clinch",
    title: `🏆 ${winner.name} wins the ${(meta?.name || "cup").replace(/^the\s+/i, "")}!`,
    body: standingsLine(rows),
  });
  return events;
}

// Standings counting only results through day `di`, so a day's summary still
// reads right if a later day has already started by the time it's sent.
function standingsAfter(days, teams, di) {
  const upTo = days.map((d, i) => (i <= di ? d : { ...d, matches: [] }));
  return standings(upTo, teams).rows;
}
