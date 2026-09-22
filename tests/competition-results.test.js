import test from "node:test";
import assert from "node:assert/strict";
import { buildGroupStandings, competitionProgress, createGroupMatches, rankingEntriesForCompetition } from "../src/competition-results.js";

const groupBracket = {
  format: "groups-knockout", qualifiersPerGroup: 2,
  groups: { A: ["1º A", "1º B", "1º C"], B: ["2º A", "2º B", "2º C"] },
  knockout: { format: "knockout", rounds: [
    { name: "Semifinais", matches: [{ a: "1º do Grupo A", b: "2º do Grupo B" }, { a: "1º do Grupo B", b: "2º do Grupo A" }] },
    { name: "Final", matches: [{ a: "Vencedor 1", b: "Vencedor 2" }] },
  ] },
};

test("gera todos os confrontos dos grupos", () => {
  assert.equal(createGroupMatches(groupBracket).length, 6);
});

test("classifica grupos por pontos, vitórias, saldo e gols", () => {
  const payload = { matches: {
    "group-A-0-1": { homeScore: 2, awayScore: 0 },
    "group-A-0-2": { homeScore: 1, awayScore: 1 },
    "group-A-1-2": { homeScore: 3, awayScore: 0 },
  } };
  const result = buildGroupStandings(groupBracket, payload);
  assert.deepEqual(result.tables.A.map((row) => [row.className, row.points]), [["1º A", 4], ["1º B", 3], ["1º C", 1]]);
  assert.equal(result.tables.A[0].qualified, true);
  assert.equal(result.tables.A[2].qualified, false);
});

test("só libera o mata-mata depois de todos os jogos dos grupos", () => {
  const partial = competitionProgress(groupBracket, { matches: {
    "group-A-0-1": { homeScore: 1, awayScore: 0 },
  } });
  assert.equal(partial.standings.complete, false);
  assert.equal(partial.knockoutMatches[0].home, null);
  assert.equal(partial.knockoutMatches[0].away, null);
});

test("propaga vencedores no mata-mata e calcula colocações", () => {
  const knockout = { format: "knockout", rounds: [
    { name: "Semifinais", matches: [{ a: "1º A", b: "1º B" }, { a: "1º C", b: "1º D" }] },
    { name: "Final", matches: [{ a: "Vencedor 1", b: "Vencedor 2" }] },
  ] };
  const progress = competitionProgress(knockout, { matches: {
    "ko-0-0": { homeScore: 2, awayScore: 1, advancedTeam: "1º A", scorers: [{ className: "1º A", studentName: "Ana", points: 2 }] },
    "ko-0-1": { homeScore: 0, awayScore: 0, advancedTeam: "1º D", homePenalty: 3, awayPenalty: 4 },
    "ko-1-0": { homeScore: 1, awayScore: 3, advancedTeam: "1º D" },
  } });
  assert.equal(progress.placements.champion, "1º D");
  assert.equal(progress.placements.runnerUp, "1º A");
  assert.deepEqual(progress.placements.thirdPlaces, ["1º B", "1º C"]);
  assert.equal(progress.scorers[0].goals, 2);
});

test("transforma jogos concluídos em lançamentos rastreáveis no ranking", () => {
  const bracket = { format: "knockout", rounds: [{ name: "Final", matches: [{ a: "1º A", b: "1º B" }] }] };
  const entries = rankingEntriesForCompetition(
    { id: "futsal", modalityId: "futsal", title: "Futsal misto" },
    bracket,
    { matches: { "ko-0-0": { homeScore: 3, awayScore: 2, advancedTeam: "1º A" } } },
  );
  assert.deepEqual(entries.map(({ class_name, points, wins, losses }) => ({ class_name, points, wins, losses })), [
    { class_name: "1º A", points: 3, wins: 1, losses: 0 },
    { class_name: "1º B", points: 0, wins: 0, losses: 1 },
  ]);
  assert.match(entries[0].label, /Futsal misto · Final · 1º A 3 × 2 1º B/);
});
