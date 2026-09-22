const score = (value) => Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;
const matchResult = (payload, id) => payload?.matches?.[id] || {};

export function createGroupMatches(bracket) {
  if (bracket?.format !== "groups-knockout") return [];
  return ["A", "B"].flatMap((group) => {
    const teams = bracket.groups?.[group] || [];
    const matches = [];
    for (let home = 0; home < teams.length; home += 1) {
      for (let away = home + 1; away < teams.length; away += 1) {
        matches.push({ id: `group-${group}-${home}-${away}`, phase: `Grupo ${group}`, group, home: teams[home], away: teams[away], knockout: false });
      }
    }
    return matches;
  });
}

export function resultIsComplete(match, result) {
  const homeScore = score(result?.homeScore);
  const awayScore = score(result?.awayScore);
  if (!match?.home || !match?.away || homeScore === null || awayScore === null) return false;
  if (!match.knockout || homeScore !== awayScore) return true;
  const homePenalty = score(result?.homePenalty);
  const awayPenalty = score(result?.awayPenalty);
  return homePenalty !== null && awayPenalty !== null && homePenalty !== awayPenalty;
}

export function winnerFor(match, result) {
  if (match?.home && !match?.away) return match.home;
  if (!resultIsComplete(match, result) || !match.knockout) return null;
  const homeScore = score(result.homeScore);
  const awayScore = score(result.awayScore);
  if (homeScore !== awayScore) return homeScore > awayScore ? match.home : match.away;
  return score(result.homePenalty) > score(result.awayPenalty) ? match.home : match.away;
}

export function buildGroupStandings(bracket, payload = {}) {
  const matches = createGroupMatches(bracket);
  const tables = {};
  for (const group of ["A", "B"]) {
    const rows = new Map((bracket?.groups?.[group] || []).map((className) => [className, {
      className, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
    }]));
    for (const match of matches.filter((item) => item.group === group)) {
      const result = matchResult(payload, match.id);
      if (!resultIsComplete(match, result)) continue;
      const home = rows.get(match.home), away = rows.get(match.away);
      const homeScore = score(result.homeScore), awayScore = score(result.awayScore);
      home.played += 1; away.played += 1;
      home.goalsFor += homeScore; home.goalsAgainst += awayScore;
      away.goalsFor += awayScore; away.goalsAgainst += homeScore;
      if (homeScore > awayScore) { home.wins += 1; home.points += 3; away.losses += 1; }
      else if (awayScore > homeScore) { away.wins += 1; away.points += 3; home.losses += 1; }
      else { home.draws += 1; away.draws += 1; home.points += 1; away.points += 1; }
    }
    tables[group] = [...rows.values()]
      .map((row) => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst }))
      .sort((a, b) => b.points - a.points || b.wins - a.wins || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.className.localeCompare(b.className, "pt-BR"))
      .map((row, index) => ({ ...row, position: index + 1, qualified: index < Math.min(bracket.qualifiersPerGroup || 4, rows.size) }));
  }
  return {
    tables,
    complete: matches.length > 0 && matches.every((match) => resultIsComplete(match, matchResult(payload, match.id))),
  };
}

function seedTeam(label, standings) {
  const match = String(label || "").match(/^(\d+)º do Grupo ([AB])$/);
  return match ? standings?.tables?.[match[2]]?.[Number(match[1]) - 1]?.className || null : label || null;
}

export function buildKnockoutMatches(bracket, payload = {}, standings = null) {
  const knockout = bracket?.format === "groups-knockout" ? bracket.knockout : bracket;
  if (!knockout?.rounds?.length) return [];
  const all = [];
  let previous = [];
  knockout.rounds.forEach((round, roundIndex) => {
    const current = round.matches.map((source, matchIndex) => {
      const id = `ko-${roundIndex}-${matchIndex}`;
      const home = roundIndex === 0
        ? (bracket.format === "groups-knockout" ? seedTeam(source.a, standings) : source.a)
        : previous[matchIndex * 2]?.winner || null;
      const away = roundIndex === 0
        ? (bracket.format === "groups-knockout" ? seedTeam(source.b, standings) : source.b)
        : previous[matchIndex * 2 + 1]?.winner || null;
      const match = { id, phase: round.name, roundIndex, matchIndex, home, away, knockout: true, bye: Boolean(home && !away) };
      const result = matchResult(payload, id);
      return { ...match, result, complete: resultIsComplete(match, result), winner: winnerFor(match, result) };
    });
    all.push(...current);
    previous = current;
  });
  return all;
}

export function competitionProgress(bracket, payload = {}) {
  const groupMatches = createGroupMatches(bracket).map((match) => {
    const result = matchResult(payload, match.id);
    return { ...match, result, complete: resultIsComplete(match, result) };
  });
  const standings = bracket?.format === "groups-knockout" ? buildGroupStandings(bracket, payload) : null;
  const knockoutMatches = buildKnockoutMatches(bracket, payload, standings);
  const final = knockoutMatches.at(-1);
  const champion = final?.winner || bracket?.automaticWinner || null;
  const runnerUp = final?.complete ? (final.winner === final.home ? final.away : final.home) : null;
  const semifinalRound = Math.max(-1, ...knockoutMatches.map((match) => match.roundIndex)) - 1;
  const thirdPlaces = semifinalRound >= 0 ? knockoutMatches
    .filter((match) => match.roundIndex === semifinalRound && match.complete)
    .map((match) => match.winner === match.home ? match.away : match.home)
    .filter(Boolean) : [];
  const scorers = Object.values(payload?.matches || {}).flatMap((result) => result.scorers || []).reduce((all, item) => {
    if (!item?.studentName || !item?.className) return all;
    const key = `${item.className}|${item.studentName}`;
    const row = all.get(key) || { className: item.className, studentName: item.studentName, goals: 0 };
    row.goals += 1;
    all.set(key, row);
    return all;
  }, new Map());
  return {
    groupMatches,
    standings,
    knockoutMatches,
    placements: { champion, runnerUp, thirdPlaces },
    scorers: [...scorers.values()].sort((a, b) => b.goals - a.goals || a.studentName.localeCompare(b.studentName, "pt-BR")),
  };
}
