import { authorized } from "./_auth.js";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const room = /^[123]º [A-Z]$/;
const types = new Set(["resultado", "frequencia", "plataforma", "bonus", "penalidade", "ajuste"]);
const headers = (key) => ({ "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` });

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
  if (!room.test(item.class_name)) throw Error("Informe uma turma válida.");
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
  const id = String(req.body?.id || "");
  if (["PATCH", "DELETE"].includes(req.method) && !uuid.test(id)) return res.status(400).json({ error: "Lançamento inválido." });
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
