import crypto from "node:crypto";
import { clearTeacherCookie, teacherAuthorized, teacherSessionCookie } from "./admin/_auth.js";
import { isSchoolClass } from "../src/school-classes.js";

const room = /^[123]º [A-Z]$/;
const headers = (key) => ({ "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` });
const clean = (value) => String(value || "").trim().replace(/\s+/g, " ");

export function normalizeOccurrenceAt(value) {
  const date = value ? new Date(String(value)) : new Date();
  if (Number.isNaN(date.getTime())) throw Error("Informe uma data e horário válidos.");
  if (date.getUTCFullYear() < 2020 || date.getUTCFullYear() > 2100) throw Error("Informe uma data entre 2020 e 2100.");
  return date.toISOString();
}

export function occurrenceLabel(studentName, description) {
  const text = clean(description);
  if (text && text.length < 3) throw Error("A descrição deve ter pelo menos 3 caracteres ou ficar em branco.");
  if (text.length > 120) throw Error("A descrição deve ter no máximo 120 caracteres.");
  return text || `Aluno cabulando: ${studentName}`.slice(0, 120);
}

async function data(req, res, url, key) {
  if (!teacherAuthorized(req)) return res.status(401).json({ error: "Não autorizado." });
  const [studentsResponse, penaltiesResponse] = await Promise.all([
    fetch(`${url}/rest/v1/interclasse_students?select=student_name,class_name&order=class_name.asc,student_name.asc&limit=5000`, { headers: headers(key) }),
    fetch(`${url}/rest/v1/interclasse_score_entries?source=eq.teacher&select=id,class_name,responsible_student,label,points,created_at&order=created_at.desc&limit=12`, { headers: headers(key) }),
  ]);
  if (!studentsResponse.ok || !penaltiesResponse.ok) return res.status(502).json({ error: "Não foi possível consultar os estudantes." });
  const seen = new Set();
  const students = (await studentsResponse.json()).filter((student) => {
    const identity = `${student.class_name}|${clean(student.student_name).toLocaleLowerCase("pt-BR")}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ students, recent: await penaltiesResponse.json() });
}

async function absence(req, res, url, key) {
  if (!teacherAuthorized(req)) return res.status(401).json({ error: "Não autorizado." });
  const className = clean(req.body?.class_name).toUpperCase();
  const studentName = clean(req.body?.student_name);
  if (!room.test(className) || !isSchoolClass(className) || studentName.length < 3 || studentName.length > 100) return res.status(400).json({ error: "Selecione uma turma e um estudante válidos." });
  let occurredAt, label;
  try {
    occurredAt = normalizeOccurrenceAt(req.body?.occurred_at);
    label = occurrenceLabel(studentName, req.body?.description);
  } catch (error) { return res.status(400).json({ error: error.message }); }
  const studentResponse = await fetch(`${url}/rest/v1/interclasse_students?class_name=eq.${encodeURIComponent(className)}&student_name=ilike.${encodeURIComponent(studentName)}&select=id&limit=1`, { headers: headers(key) });
  const matches = await studentResponse.json();
  if (!studentResponse.ok || !matches.length) return res.status(404).json({ error: "Estudante não encontrado nesta turma." });
  const since = new Date(new Date(occurredAt).getTime() - 5 * 60 * 1000).toISOString();
  const until = new Date(new Date(occurredAt).getTime() + 5 * 60 * 1000).toISOString();
  const duplicateResponse = await fetch(`${url}/rest/v1/interclasse_score_entries?source=eq.teacher&class_name=eq.${encodeURIComponent(className)}&responsible_student=ilike.${encodeURIComponent(studentName)}&created_at=gte.${encodeURIComponent(since)}&created_at=lte.${encodeURIComponent(until)}&select=id&limit=1`, { headers: headers(key) });
  if (duplicateResponse.ok && (await duplicateResponse.json()).length) return res.status(409).json({ error: "Esta ocorrência já foi registrada nos últimos 5 minutos." });
  const response = await fetch(`${url}/rest/v1/interclasse_score_entries`, {
    method: "POST",
    headers: { ...headers(key), Prefer: "return=representation" },
    body: JSON.stringify({ class_name: className, modality_id: null, entry_type: "penalidade", label, points: -10, wins: 0, draws: 0, losses: 0, responsible_student: studentName, source: "teacher", created_at: occurredAt, updated_at: new Date().toISOString() }),
  });
  const result = await response.json();
  if (!response.ok) return res.status(502).json({ error: "Não foi possível registrar a penalidade." });
  return res.status(201).json(result[0]);
}

export default async function handler(req, res) {
  const action = String(req.body?.action || req.query?.action || (req.method === "GET" ? "data" : ""));
  if (action === "login" && req.method === "POST") {
    const expected = process.env.TEACHER_PASSWORD || "";
    const provided = String(req.body?.password || "");
    if (!expected) return res.status(503).json({ error: "O acesso dos professores ainda não foi configurado." });
    if (provided.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return res.status(401).json({ error: "Senha incorreta." });
    res.setHeader("Set-Cookie", teacherSessionCookie());
    return res.status(200).json({ ok: true });
  }
  if (action === "logout" && req.method === "POST") {
    res.setHeader("Set-Cookie", clearTeacherCookie());
    return res.status(200).json({ ok: true });
  }
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: "Serviço ainda não configurado." });
  if (action === "data" && req.method === "GET") return data(req, res, url, key);
  if (action === "absence" && req.method === "POST") return absence(req, res, url, key);
  return res.status(405).end();
}
