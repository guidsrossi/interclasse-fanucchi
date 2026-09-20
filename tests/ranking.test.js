import test from "node:test";
import assert from "node:assert/strict";
import { buildRanking, rankingRules } from "../src/ranking-data.js";

test("ranking soma pontos e resultados de todas as modalidades", () => {
  const ranking = buildRanking([
    { class_name: "1º A", points: 10, wins: 1, draws: 0, losses: 0 },
    { class_name: "1º A", points: 25, wins: 0, draws: 1, losses: 0 },
    { class_name: "2º B", points: 30, wins: 2, draws: 0, losses: 1 },
  ]);
  assert.deepEqual(ranking.map(({ className, points, wins }) => ({ className, points, wins })), [
    { className: "1º A", points: 35, wins: 1 },
    { className: "2º B", points: 30, wins: 2 },
  ]);
});

test("ranking aceita penalidades e desempata por vitórias", () => {
  const ranking = buildRanking([
    { class_name: "1º A", points: 20, wins: 1 },
    { class_name: "2º A", points: 30, wins: 2 },
    { class_name: "2º A", points: -10 },
  ]);
  assert.equal(ranking[0].className, "2º A");
  assert.equal(ranking[0].points, 20);
});

test("regras refletem as faixas informadas", () => {
  assert.deepEqual(rankingRules.attendance.map((item) => item.points), [10, 15, 20, 25]);
  assert.deepEqual(rankingRules.platform.map((item) => item.points), [100, 85, 40]);
});
