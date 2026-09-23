import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOccurrenceAt, occurrenceLabel } from "../api/teacher.js";

test("usa e normaliza o horário informado pelo professor", () => {
  assert.equal(normalizeOccurrenceAt("2026-09-23T14:30:00-03:00"), "2026-09-23T17:30:00.000Z");
  assert.throws(() => normalizeOccurrenceAt("horário inválido"), /data e horário válidos/);
});

test("aceita descrição opcional da ocorrência", () => {
  assert.equal(occurrenceLabel("Ana Silva", "  Fora da sala após o intervalo  "), "Fora da sala após o intervalo");
  assert.equal(occurrenceLabel("Ana Silva", ""), "Aluno cabulando: Ana Silva");
  assert.throws(() => occurrenceLabel("Ana Silva", "x"), /pelo menos 3 caracteres/);
  assert.throws(() => occurrenceLabel("Ana Silva", "x".repeat(121)), /no máximo 120 caracteres/);
});
