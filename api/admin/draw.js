import { authorized } from "./_auth.js";

const headers = (key) => ({
  "Content-Type": "application/json",
  apikey: key,
  Authorization: `Bearer ${key}`,
});

function validDraw(draw) {
  return (
    draw &&
    draw.version === 3 &&
    typeof draw.generatedAt === "string" &&
    typeof draw.signature === "string" &&
    draw.brackets &&
    typeof draw.brackets === "object" &&
    !Array.isArray(draw.brackets) &&
    JSON.stringify(draw).length <= 250000
  );
}

export default async function handler(req, res) {
  if (!authorized(req))
    return res.status(401).json({ error: "Não autorizado." });
  if (!["GET", "PUT", "DELETE"].includes(req.method))
    return res.status(405).end();
  const url = process.env.VITE_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    return res
      .status(503)
      .json({ error: "Administração ainda não configurada." });
  const endpoint = `${url}/rest/v1/interclasse_draws?id=eq.official`;
  if (req.method === "GET") {
    const response = await fetch(
      `${endpoint}&select=payload,updated_at&limit=1`,
      { headers: headers(key) },
    );
    if (!response.ok)
      return res
        .status(502)
        .json({ error: "Não foi possível consultar o sorteio." });
    const [record] = await response.json();
    res.setHeader("Cache-Control", "no-store");
    return res
      .status(200)
      .json(
        record
          ? { draw: record.payload, updatedAt: record.updated_at }
          : { draw: null },
      );
  }
  if (req.method === "DELETE") {
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: headers(key),
    });
    if (!response.ok)
      return res
        .status(502)
        .json({ error: "Não foi possível remover o sorteio publicado." });
    return res.status(200).json({ ok: true });
  }
  const draw = req.body?.draw;
  if (!validDraw(draw))
    return res.status(400).json({ error: "Resultado de sorteio inválido." });
  const response = await fetch(`${url}/rest/v1/interclasse_draws`, {
    method: "POST",
    headers: {
      ...headers(key),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      id: "official",
      payload: draw,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok)
    return res
      .status(502)
      .json({ error: "Não foi possível publicar o sorteio." });
  return res.status(200).json({ ok: true });
}
