import { buildRanking } from "../src/ranking-data.js";

const headers = (key) => ({ apikey: key, Authorization: `Bearer ${key}` });

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(200).json({ ranking: [], entries: [] });
  const [scoresResponse, classesResponse] = await Promise.all([
    fetch(`${url}/rest/v1/interclasse_score_entries?select=id,class_name,modality_id,entry_type,label,points,wins,draws,losses,responsible_student,source,competition_id,match_id,attendance_week,attendance_rate,created_at,updated_at&order=updated_at.desc`, { headers: headers(key) }),
    fetch(`${url}/rest/v1/interclasse_registrations?select=class_name`, { headers: headers(key) }),
  ]);
  if (!scoresResponse.ok || !classesResponse.ok) return res.status(502).json({ error: "Não foi possível consultar o ranking." });
  const entries = await scoresResponse.json();
  const classes = [...new Set((await classesResponse.json()).map((row) => row.class_name))];
  res.setHeader("Cache-Control", "public, max-age=15, s-maxage=30, stale-while-revalidate=120");
  return res.status(200).json({
    ranking: buildRanking(entries, classes),
    entries,
    updatedAt: entries[0]?.updated_at || null,
  });
}
