export const schoolClasses = Object.freeze([
  "1º A", "1º B", "1º C", "1º D", "1º E",
  "2º A", "2º B", "2º C", "2º D",
  "3º A", "3º B", "3º C", "3º D", "3º E",
]);

const classSet = new Set(schoolClasses);

export function isSchoolClass(value) {
  return classSet.has(String(value || "").trim().toUpperCase());
}
