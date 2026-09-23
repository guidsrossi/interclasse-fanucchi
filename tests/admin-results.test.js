import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMatchResult, normalizeScheduledAt } from "../api/admin/results.js";

const students = new Set(["1º A|ana", "1º B|bia"]);
const groupMatch = { home: "1º A", away: "1º B", knockout: false };

test("valida placar e distribuição dos pontos entre estudantes", () => {
  const result = normalizeMatchResult({
    homeScore: 2,
    awayScore: 1,
    scorers: [
      { className: "1º A", studentName: "Ana", points: 2 },
      { className: "1º B", studentName: "Bia", points: 1 },
    ],
  }, groupMatch, students);
  assert.equal(result.homeScore, 2);
  assert.equal(result.scorers[0].points, 2);
});

test("rejeita pontuação individual diferente do placar", () => {
  assert.throws(() => normalizeMatchResult({
    homeScore: 2,
    awayScore: 0,
    scorers: [{ className: "1º A", studentName: "Ana", points: 1 }],
  }, groupMatch, students), /Distribua os 2 pontos/);
});

test("exige que o admin escolha manualmente quem avança no mata-mata", () => {
  assert.throws(() => normalizeMatchResult({
    homeScore: 2,
    awayScore: 0,
    scorers: [{ className: "1º A", studentName: "Ana", points: 2 }],
  }, { ...groupMatch, knockout: true }, students), /Escolha qual turma avançou/);
  const result = normalizeMatchResult({
    homeScore: 0,
    awayScore: 0,
    advancedTeam: "1º B",
    scorers: [],
  }, { ...groupMatch, knockout: true }, students);
  assert.equal(result.advancedTeam, "1º B");
});

test("normaliza data e horário do confronto", () => {
  assert.equal(normalizeScheduledAt("2026-10-05T14:30:00-03:00"), "2026-10-05T17:30:00.000Z");
  assert.equal(normalizeScheduledAt(""), null);
  assert.throws(() => normalizeScheduledAt("data inválida"), /data e horário válidos/);
});
