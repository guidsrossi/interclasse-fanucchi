import test from "node:test";
import assert from "node:assert/strict";
import { scoreEntryPayload } from "../api/admin/ranking.js";

const baseEntry = {
  class_name: "3º A",
  modality_id: "",
  entry_type: "penalidade",
  label: "Assistindo o jogo na escada durante a aula",
  points: -10,
  wins: 0,
  draws: 0,
  losses: 0,
};

test("penalidade administrativa mantém aluno separado da justificativa por extenso", () => {
  const entry = scoreEntryPayload({ ...baseEntry, responsible_student: "  João   da Silva  " });

  assert.equal(entry.label, "Assistindo o jogo na escada durante a aula");
  assert.equal(entry.responsible_student, "João da Silva");
});

test("penalidade administrativa exige o aluno responsável", () => {
  assert.throws(() => scoreEntryPayload(baseEntry), /aluno responsável/i);
});

test("outros lançamentos não gravam aluno responsável", () => {
  const entry = scoreEntryPayload({
    ...baseEntry,
    entry_type: "bonus",
    points: 10,
    responsible_student: "Nome indevido",
  });

  assert.equal(entry.responsible_student, null);
});
