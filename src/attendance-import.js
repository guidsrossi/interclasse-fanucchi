import { isSchoolClass, schoolClasses } from "./school-classes.js";

export const attendanceClasses = schoolClasses;

const cleanText = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toUpperCase();

export function classNameFromReport(value) {
  const text = cleanText(value);
  const detailed = text.match(/(?:^|\D)([123])\s*[ªº°]\s*SERIE\s*([A-E])\b/);
  const compact = text.match(/(?:^|\D)([123])\s*[ªº°]?\s*([A-E])\b/);
  const match = detailed || compact;
  return match ? `${match[1]}º ${match[2]}` : null;
}

export function normalizeAttendanceRate(value) {
  if (value === null || value === undefined || value === "") return null;
  const isPercentText = typeof value === "string" && value.includes("%");
  const parsed = typeof value === "number"
    ? value
    : Number(String(value).replace("%", "").replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(parsed)) return null;
  const percentage = !isPercentText && parsed >= 0 && parsed <= 1 ? parsed * 100 : parsed;
  if (percentage < 0 || percentage > 100) return null;
  return Math.round((percentage + Number.EPSILON) * 100) / 100;
}

export function attendancePoints(rate) {
  const percentage = normalizeAttendanceRate(rate);
  if (percentage === null) return null;
  if (percentage >= 100) return 25;
  if (percentage >= 95) return 20;
  if (percentage >= 90) return 15;
  if (percentage >= 85) return 10;
  return 0;
}

export function currentWeekStart(date = new Date()) {
  const monday = new Date(date);
  const daysSinceMonday = (monday.getDay() + 6) % 7;
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - daysSinceMonday);
  return [monday.getFullYear(), String(monday.getMonth() + 1).padStart(2, "0"), String(monday.getDate()).padStart(2, "0")].join("-");
}

export function parseAttendanceRows(rows) {
  if (!Array.isArray(rows) || !rows.length) throw Error("A planilha está vazia.");
  const headerIndex = rows.findIndex((row) => {
    const headers = Array.isArray(row) ? row.map(cleanText) : [];
    return headers.includes("TURMA") && headers.some((header) => header.includes("PRESENCA"));
  });
  if (headerIndex < 0) throw Error('Não encontrei as colunas "Turma" e "(%) de Presença".');

  const headers = rows[headerIndex].map(cleanText);
  const classColumn = headers.indexOf("TURMA");
  const attendanceColumn = headers.findIndex((header) => header.includes("PRESENCA") && !header.includes("EVOLUCAO"));
  if (classColumn < 0 || attendanceColumn < 0) throw Error("A estrutura da planilha não é compatível com o relatório de frequência.");

  const entries = [];
  const ignored = [];
  const seen = new Set();
  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index] || [];
    const rawClass = row[classColumn];
    const rawRate = row[attendanceColumn];
    if ((rawClass === null || rawClass === undefined || rawClass === "") && (rawRate === null || rawRate === undefined || rawRate === "")) continue;
    const className = classNameFromReport(rawClass);
    const attendanceRate = normalizeAttendanceRate(rawRate);
    if (!className || !isSchoolClass(className) || attendanceRate === null) {
      if (rawRate !== null && rawRate !== undefined && rawRate !== "") ignored.push(index + 1);
      continue;
    }
    if (seen.has(className)) throw Error(`A turma ${className} aparece mais de uma vez na planilha.`);
    seen.add(className);
    entries.push({ className, attendanceRate, points: attendancePoints(attendanceRate) });
  }
  if (!entries.length) throw Error("Nenhuma turma com percentual de presença foi encontrada.");
  entries.sort((a, b) => a.className.localeCompare(b.className, "pt-BR"));
  return {
    entries,
    missingClasses: attendanceClasses.filter((className) => !seen.has(className)),
    ignoredRows: ignored,
  };
}
