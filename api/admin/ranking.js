import { authorized } from "./_auth.js";
import { normalizeAttendanceRate } from "../../src/attendance-import.js";
import { isSchoolClass } from "../../src/school-classes.js";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const room = /^[123]º [A-Z]$/;
const types = new Set(["resultado", "frequencia", "plataforma", "bonus", "penalidade", "ajuste"]);
const headers = (key) => ({ "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` });

function weeklyAttendancePayload(body = {}) {
  const weekStart = String(body.weekStart || "");
  const weekDate = new Date(`${weekStart}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || Number.isNaN(weekDate.getTime()) || weekDate.getUTCDay() !== 1) {
    throw Error("Escolha a segunda-feira da semana da frequência.");
  }
  if (!Array.isArray(body.entries) || body.entries.length < 1 || body.entries.length > 30) {
    throw Error("A planilha deve conter entre 1 e 30 turmas.");
  }
  const seen = new Set();
  const entries = body.entries.map((entry) => {
    const className = String(entry?.className || entry?.class_name || "").trim().toUpperCase();
    const attendanceRate = normalizeAttendanceRate(entry?.attendanceRate ?? entry?.attendance_rate);
    if (!room.test(className) || !isSchoolClass(className)) throw Error("A planilha contém uma turma inexistente.");
    if (attendanceRate === null) throw Error(`A frequência da turma ${className} é inválida.`);
    if (seen.has(className)) throw Error(`A turma ${className} aparece mais de uma vez na planilha.`);
    seen.add(className);
    return { class_name: className, attendance_rate: attendanceRate };
  });
  return { p_week_start: weekStart, p_entries: entries };
}

function payload(body = {}) {
  const item = {
    class_name: String(body.class_name || "").trim().toUpperCase(),
    modality_id: body.modality_id ? String(body.modality_id) : null,
    entry_type: String(body.entry_type || ""),
    label: String(body.label || "").trim().replace(/\s+/g, " "),
    points: Number(body.points),
    wins: Number(body.wins || 0),
    draws: Number(body.draws || 0),
    losses: Number(body.losses || 0),
    updated_at: new Date().toISOString(),
  };
  if (!room.test(item.class_name) || !isSchoolClass(item.class_name)) throw Error("Informe uma turma existente.");
  if (!types.has(item.entry_type)) throw Error("Escolha um tipo de lançamento válido.");
  if (item.label.length < 3 || item.label.length > 120) throw Error("Descreva o lançamento entre 3 e 120 caracteres.");
  if (![item.points, item.wins, item.draws, item.losses].every(Number.isInteger)) throw Error("Pontos e resultados devem ser números inteiros.");
  if (Math.abs(item.points) > 10000 || [item.wins, item.draws, item.losses].some((value) => value < 0 || value > 999)) throw Error("Os valores informados estão fora do limite permitido.");
  return item;
}

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: "Não autorizado." });
  if (!["GET", "POST", "PATCH", "DELETE"].includes(req.method)) return res.status(405).end();
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: "Administração ainda não configurada." });
  if (req.method === "GET") {
    const response = await fetch(`${url}/rest/v1/interclasse_score_entries?select=*&order=updated_at.desc`, { headers: headers(key) });
    if (!response.ok) return res.status(502).json({ error: "Não foi possível consultar o ranking." });
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(await response.json());
  }
  if (req.method === "POST" && req.body?.action === "weeklyAttendance") {
    let weekly;
    try { weekly = weeklyAttendancePayload(req.body); } catch (error) { return res.status(400).json({ error: error.message }); }
    const response = await fetch(`${url}/rest/v1/rpc/interclasse_import_weekly_attendance`, {
      method: "POST",
      headers: { ...headers(key), Prefer: "return=representation" },
      body: JSON.stringify(weekly),
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data?.message || "Não foi possível importar a frequência semanal." });
    return res.status(200).json({ imported: data.length, entries: data });
  }
  const id = String(req.body?.id || "");
  if (["PATCH", "DELETE"].includes(req.method) && !uuid.test(id)) return res.status(400).json({ error: "Lançamento inválido." });
  if (["PATCH", "DELETE"].includes(req.method)) {
    const existingResponse = await fetch(`${url}/rest/v1/interclasse_score_entries?id=eq.${id}&select=source&limit=1`, { headers: headers(key) });
    const existing = existingResponse.ok ? (await existingResponse.json())[0] : null;
    if (!existing) return res.status(404).json({ error: "Lançamento não encontrado." });
    if (existing.source === "competition") return res.status(409).json({ error: "Altere este lançamento pela aba Resultados dos jogos." });
  }
  if (req.method === "DELETE") {
    const response = await fetch(`${url}/rest/v1/interclasse_score_entries?id=eq.${id}`, { method: "DELETE", headers: { ...headers(key), Prefer: "return=representation" } });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: "Não foi possível excluir o lançamento." });
    return data.length ? res.status(200).json({ ok: true }) : res.status(404).json({ error: "Lançamento não encontrado." });
  }
  let item;
  try { item = payload(req.body); } catch (error) { return res.status(400).json({ error: error.message }); }
  const endpoint = req.method === "POST" ? `${url}/rest/v1/interclasse_score_entries` : `${url}/rest/v1/interclasse_score_entries?id=eq.${id}`;
  const response = await fetch(endpoint, {
    method: req.method,
    headers: { ...headers(key), Prefer: "return=representation" },
    body: JSON.stringify(item),
  });
  const data = await response.json();
  if (!response.ok) return res.status(502).json({ error: data?.message?.includes("foreign key") ? "Modalidade inválida." : "Não foi possível salvar o lançamento." });
  return res.status(req.method === "POST" ? 201 : 200).json(data[0]);
}
