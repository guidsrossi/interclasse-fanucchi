import test from "node:test";
import assert from "node:assert/strict";
import {
  attendancePoints,
  classNameFromReport,
  currentWeekStart,
  normalizeAttendanceRate,
  parseAttendanceRows,
} from "../src/attendance-import.js";
import { readAttendanceXlsx } from "../src/xlsx-attendance-reader.js";
import { strToU8, zipSync } from "fflate";

test("converte os nomes extensos do relatório em turmas do ranking", () => {
  assert.equal(classNameFromReport("6090 - CIÊNCIA DE DADOS - 3ª SERIE A INTEGRAL 9H ANUAL - 40963633"), "3º A");
  assert.equal(classNameFromReport("2ª SERIE B INTEGRAL 9H ANUAL - 40953102"), "2º B");
  assert.equal(classNameFromReport("1º E"), "1º E");
});

test("normaliza percentuais numéricos e textuais", () => {
  assert.equal(normalizeAttendanceRate(0.962284), 96.23);
  assert.equal(normalizeAttendanceRate("94,87%"), 94.87);
  assert.equal(normalizeAttendanceRate("0,9"), 90);
  assert.equal(normalizeAttendanceRate(101), null);
});

test("atribui as faixas de pontos da frequência", () => {
  assert.equal(attendancePoints(100), 25);
  assert.equal(attendancePoints(95), 20);
  assert.equal(attendancePoints(90), 15);
  assert.equal(attendancePoints(85), 10);
  assert.equal(attendancePoints(84.99), 0);
});

test("interpreta o formato da planilha semanal e informa turmas ausentes", () => {
  const parsed = parseAttendanceRows([
    ["Turma", "Matrículas Ativas", "(%) de Presença", "(%) Evolução Presença"],
    ["3ª SERIE A INTEGRAL 9H ANUAL - 1", 22, 0.962284, 0.01],
    ["2ª SERIE B INTEGRAL 9H ANUAL - 2", 24, "94,87%", 0.02],
    ["Filtros aplicados", null, null, null],
  ]);
  assert.deepEqual(parsed.entries, [
    { className: "2º B", attendanceRate: 94.87, points: 15 },
    { className: "3º A", attendanceRate: 96.23, points: 20 },
  ]);
  assert.equal(parsed.missingClasses.length, 12);
  assert.ok(!parsed.missingClasses.includes("2º E"));
  assert.deepEqual(parsed.ignoredRows, []);
});

test("calcula a segunda-feira da semana no calendário local", () => {
  assert.equal(currentWeekStart(new Date(2026, 8, 21)), "2026-09-21");
  assert.equal(currentWeekStart(new Date(2026, 8, 27)), "2026-09-21");
});

test("lê o XLSX exportado com namespace e células sem referência", () => {
  const sheet = `<?xml version="1.0" encoding="utf-8"?><x:worksheet xmlns:x="urn:test"><x:sheetData><x:row><x:c t="inlineStr"><x:is><x:t>Turma</x:t></x:is></x:c><x:c t="inlineStr"><x:is><x:t>(%) de Presença</x:t></x:is></x:c></x:row><x:row><x:c t="inlineStr"><x:is><x:t>3ª SERIE A INTEGRAL</x:t></x:is></x:c><x:c><x:v>0.962284</x:v></x:c></x:row></x:sheetData></x:worksheet>`;
  const zipped = zipSync({ "xl/worksheets/sheet1.xml": strToU8(sheet) });
  const buffer = zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength);
  const parsed = parseAttendanceRows(readAttendanceXlsx(buffer));
  assert.deepEqual(parsed.entries, [{ className: "3º A", attendanceRate: 96.23, points: 20 }]);
});
