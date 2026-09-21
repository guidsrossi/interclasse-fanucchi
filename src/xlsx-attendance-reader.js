import { unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

const decoder = new TextDecoder("utf-8");
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  parseTagValue: false,
  trimValues: false,
  processEntities: false,
  removeNSPrefix: true,
});

const list = (value) => value === undefined ? [] : Array.isArray(value) ? value : [value];

function xml(bytes, label) {
  if (!bytes) return null;
  const source = decoder.decode(bytes);
  if (/<!DOCTYPE/i.test(source)) throw Error(`${label} contém uma declaração XML não permitida.`);
  return parser.parse(source);
}

function nodeText(node) {
  if (node === null || node === undefined) return "";
  if (["string", "number", "boolean"].includes(typeof node)) return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (node.t !== undefined) return nodeText(node.t);
  if (node.r !== undefined) return list(node.r).map((run) => nodeText(run?.t)).join("");
  if (node["#text"] !== undefined) return nodeText(node["#text"]);
  return "";
}

function columnIndex(reference = "") {
  const letters = String(reference).match(/^[A-Z]+/i)?.[0]?.toUpperCase();
  if (!letters) return -1;
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

export function readAttendanceXlsx(arrayBuffer) {
  const input = new Uint8Array(arrayBuffer);
  if (!input.length || input.length > 10 * 1024 * 1024) throw Error("A planilha deve ter no máximo 10 MB.");
  let archive;
  try { archive = unzipSync(input); } catch { throw Error("O arquivo não é uma planilha .xlsx válida."); }
  const sheetPath = Object.keys(archive)
    .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0];
  if (!sheetPath) throw Error("A planilha não possui nenhuma aba legível.");
  const sharedDocument = xml(archive["xl/sharedStrings.xml"], "A tabela de textos");
  const sharedStrings = list(sharedDocument?.sst?.si).map(nodeText);
  const sheet = xml(archive[sheetPath], "A aba da frequência");
  const rows = [];
  for (const row of list(sheet?.worksheet?.sheetData?.row)) {
    const rowNumber = Number(row?.["@r"] || rows.length + 1);
    if (!Number.isInteger(rowNumber) || rowNumber < 1 || rowNumber > 500) continue;
    const values = [];
    for (const [cellPosition, cell] of list(row?.c).entries()) {
      const referencedIndex = columnIndex(cell?.["@r"]);
      const index = referencedIndex >= 0 ? referencedIndex : cellPosition;
      if (index < 0 || index > 49) continue;
      const type = cell?.["@t"];
      const raw = nodeText(cell?.v);
      if (type === "s") values[index] = sharedStrings[Number(raw)] ?? "";
      else if (type === "inlineStr") values[index] = nodeText(cell?.is);
      else if (type === "b") values[index] = raw === "1";
      else if (raw !== "" && Number.isFinite(Number(raw))) values[index] = Number(raw);
      else values[index] = raw;
    }
    rows[rowNumber - 1] = values;
  }
  return rows;
}
