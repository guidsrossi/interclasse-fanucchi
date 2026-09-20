export const rankingRules = Object.freeze({
  attendance: [
    { label: "85% ou mais", points: 10 },
    { label: "90% ou mais", points: 15 },
    { label: "95% ou mais", points: 20 },
    { label: "100%", points: 25 },
  ],
  platform: [
    { label: "Verde", points: 100 },
    { label: "Amarelo", points: 85 },
    { label: "Vermelho", points: 40 },
  ],
});

export const scoreTypes = Object.freeze([
  ["resultado", "Resultado esportivo"],
  ["frequencia", "Frequência"],
  ["plataforma", "Plataforma"],
  ["bonus", "Bônus"],
  ["penalidade", "Penalidade"],
  ["ajuste", "Ajuste manual"],
]);

export function buildRanking(entries = [], classNames = []) {
  const totals = new Map(
    classNames.filter(Boolean).map((className) => [className, {
      className,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      entries: 0,
    }]),
  );
  entries.forEach((entry) => {
    if (!entry?.class_name) return;
    const row = totals.get(entry.class_name) || {
      className: entry.class_name,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      entries: 0,
    };
    row.points += Number(entry.points) || 0;
    row.wins += Number(entry.wins) || 0;
    row.draws += Number(entry.draws) || 0;
    row.losses += Number(entry.losses) || 0;
    row.entries += 1;
    totals.set(entry.class_name, row);
  });
  return [...totals.values()]
    .sort((a, b) => b.points - a.points || b.wins - a.wins || a.className.localeCompare(b.className, "pt-BR"))
    .map((row, index) => ({ ...row, position: index + 1 }));
}
