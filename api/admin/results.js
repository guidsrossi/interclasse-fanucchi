import { authorized } from "./_auth.js";

const headers = (key) => ({ "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` });
const competitionIdPattern = /^[\p{L}\p{N}: _—-]{1,180}$/u;

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: "Não autorizado." });
  if (!["GET", "PUT"].includes(req.method)) return res.status(405).end();
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: "Administração ainda não configurada." });
  if (req.method === "GET") {
    const [resultsResponse, studentsResponse] = await Promise.all([
      fetch(`${url}/rest/v1/interclasse_competition_results?select=competition_id,payload,updated_at&order=updated_at.desc`, { headers: headers(key) }),
      fetch(`${url}/rest/v1/interclasse_students?select=class_name,student_name&order=class_name.asc,student_name.asc&limit=5000`, { headers: headers(key) }),
    ]);
    if (!resultsResponse.ok || !studentsResponse.ok) return res.status(502).json({ error: "Não foi possível consultar os resultados." });
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ results: await resultsResponse.json(), students: await studentsResponse.json() });
  }
  const competitionId = String(req.body?.competitionId || "").trim();
  const payload = req.body?.payload;
  if (!competitionIdPattern.test(competitionId)) return res.status(400).json({ error: "Competição inválida." });
  if (!payload || payload.version !== 1 || typeof payload.matches !== "object" || Array.isArray(payload.matches) || JSON.stringify(payload).length > 400000) {
    return res.status(400).json({ error: "Resultados inválidos." });
  }
  const response = await fetch(`${url}/rest/v1/interclasse_competition_results`, {
    method: "POST",
    headers: { ...headers(key), Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ competition_id: competitionId, payload, updated_at: new Date().toISOString() }),
  });
  const data = await response.json();
  if (!response.ok) return res.status(502).json({ error: "Não foi possível salvar os resultados." });
  return res.status(200).json(data[0]);
}
