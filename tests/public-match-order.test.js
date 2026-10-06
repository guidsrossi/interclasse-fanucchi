import test from "node:test";
import assert from "node:assert/strict";
import { orderLeagueMatchesForDisplay } from "../src/public-match-order.js";

test("ordena visualmente os jogos do FIFA por ano e turma", () => {
  const matches = [
    { id: "third", home: "3º A", away: "1º C", result: {} },
    { id: "second", home: "2º A", away: "1º B", result: {} },
    { id: "first", home: "1º A", away: "3º E", result: {} },
    { id: "fourth", home: "1º B", away: "1º C", result: {} },
  ];

  const ordered = orderLeagueMatchesForDisplay(matches);

  assert.deepEqual(ordered.map(({ home, away }) => [home, away]), [
    ["1º A", "3º E"],
    ["1º B", "1º C"],
    ["1º B", "2º A"],
    ["1º C", "3º A"],
  ]);
  assert.deepEqual(matches.map(({ home, away }) => [home, away]), [
    ["3º A", "1º C"],
    ["2º A", "1º B"],
    ["1º A", "3º E"],
    ["1º B", "1º C"],
  ]);
});

test("mantém placar e pênaltis ligados à turma ao inverter apenas a exibição", () => {
  const [match] = orderLeagueMatchesForDisplay([{
    id: "league-0-1",
    home: "2º A",
    away: "1º B",
    result: { homeScore: 3, awayScore: 1, homePenalty: 5, awayPenalty: 4, advancedTeam: "2º A" },
  }]);

  assert.equal(match.id, "league-0-1");
  assert.deepEqual([match.home, match.result.homeScore, match.away, match.result.awayScore], ["1º B", 1, "2º A", 3]);
  assert.deepEqual([match.result.homePenalty, match.result.awayPenalty, match.result.advancedTeam], [4, 5, "2º A"]);
});
