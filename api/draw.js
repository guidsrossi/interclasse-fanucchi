const headers = (key) => ({ apikey: key, Authorization: `Bearer ${key}` });

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const url = process.env.VITE_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    return res.status(503).json({ error: "Sorteio ainda não configurado." });
  const response = await fetch(
    `${url}/rest/v1/interclasse_draws?id=eq.official&select=payload,updated_at&limit=1`,
    { headers: headers(key) },
  );
  if (!response.ok)
    return res
      .status(502)
      .json({ error: "Não foi possível consultar o sorteio." });
  const [record] = await response.json();
  res.setHeader(
    "Cache-Control",
    "public, max-age=0, s-maxage=30, stale-while-revalidate=120",
  );
  return res
    .status(200)
    .json(
      record
        ? { draw: record.payload, updatedAt: record.updated_at }
        : { draw: null },
    );
}
