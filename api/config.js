const headers = (key) => ({ apikey: key, Authorization: `Bearer ${key}` });

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(200).json({ registrationsOpen: false });
  const response = await fetch(
    `${url}/rest/v1/interclasse_settings?id=eq.official&select=registrations_open&limit=1`,
    { headers: headers(key) },
  );
  if (!response.ok) return res.status(502).json({ error: 'Não foi possível consultar as inscrições.' });
  const [settings] = await response.json();
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=15, stale-while-revalidate=30');
  return res.status(200).json({ registrationsOpen: settings?.registrations_open === true });
}
