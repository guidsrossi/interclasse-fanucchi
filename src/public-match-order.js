const classCollator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

function compareClasses(first, second) {
  return classCollator.compare(String(first || ""), String(second || ""));
}

function classOrderedMatch(match) {
  if (!match?.home || !match?.away || compareClasses(match.home, match.away) <= 0) return match;
  const result = match.result || {};
  return {
    ...match,
    home: match.away,
    away: match.home,
    result: {
      ...result,
      homeScore: result.awayScore,
      awayScore: result.homeScore,
      homePenalty: result.awayPenalty,
      awayPenalty: result.homePenalty,
    },
  };
}

export function orderLeagueMatchesForDisplay(matches) {
  return (matches || [])
    .map(classOrderedMatch)
    .sort((first, second) => compareClasses(first.home, second.home) || compareClasses(first.away, second.away));
}
