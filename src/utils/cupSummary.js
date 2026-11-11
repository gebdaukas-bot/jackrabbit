// A one-glance summary of a cup for the Home screen: score, whether anything is
// live, how far through the trip it is, and where/when — enough to tell two
// cups with the same name apart.
import { assembleDays } from "./cupEvents.js";
import { computeMatchStatus, standings } from "./scoring.js";
import { getTeams, matchTeams } from "./teams.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function summarizeCup(cup) {
  if (!cup?.meta) return null;
  const teams = getTeams(cup.meta);
  const days = assembleDays(cup.days, cup.matches, cup.scores);
  const { rows, winner } = standings(days, teams);

  let live = 0, done = 0, total = 0, currentDay = -1;
  days.forEach((d, di) => {
    for (const m of d.matches) {
      const { a, b } = matchTeams(teams, m);
      const r = d.rounds?.[m.roundIdx ?? 0] || {};
      const s = computeMatchStatus(m.scores, a.short, b.short, m.startHole || 0, r.totalHoles || 18);
      total++;
      if (s.state === "complete" || s.state === "halved") done++;
      else if (s.state !== "pending") { live++; if (currentDay < 0) currentDay = di; }
    }
  });
  // With nothing in progress, "where are we" is the first day with unfinished matches.
  if (currentDay < 0) currentDay = days.findIndex(d => d.matches.some(m => {
    const { a, b } = matchTeams(teams, m);
    const s = computeMatchStatus(m.scores, a.short, b.short, m.startHole || 0, d.rounds?.[m.roundIdx ?? 0]?.totalHoles || 18);
    return s.state !== "complete" && s.state !== "halved";
  }));

  const finished = !!winner || (total > 0 && done === total);
  const started = done > 0 || live > 0;
  const course = days[0]?.rounds?.[0]?.course?.name;
  const created = cup.meta.createdAt ? new Date(cup.meta.createdAt) : null;
  const when = created ? `${MONTHS[created.getMonth()]} ${created.getFullYear()}` : null;

  let status;
  if (cup.meta.eventType === "live_match") status = finished ? "Final" : started ? "In progress" : "Not started";
  else if (finished) status = winner ? `${winner.name} won` : "Final";
  else if (!started) status = days.length ? `${days.length} day${days.length === 1 ? "" : "s"} · not started` : "Not started";
  else status = `Day ${currentDay + 1} of ${days.length}${days[currentDay]?.label ? ` · ${days[currentDay].label.split(/\s+[—-]\s+/)[0]}` : ""}`;

  return {
    rows, // standings, best first: { team, actual, proj }
    teams, live, finished, started, status,
    place: [course && course !== "TBD" ? course : null, when].filter(Boolean).join(" · "),
  };
}
