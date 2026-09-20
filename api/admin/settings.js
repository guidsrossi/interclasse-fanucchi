import { authorized } from './_auth.js';

const headers = (key) => ({ 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` });

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'Não autorizado.' });
  if (!['GET', 'PUT'].includes(req.method)) return res.status(405).end();
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Administração ainda não configurada.' });
  if (req.method === 'GET') {
    const response = await fetch(
      `${url}/rest/v1/interclasse_settings?id=eq.official&select=registrations_open,updated_at&limit=1`,
      { headers: headers(key) },
    );
    if (!response.ok) return res.status(502).json({ error: 'Não foi possível consultar as inscrições.' });
    const [settings] = await response.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ registrationsOpen: settings?.registrations_open === true });
  }
  if (typeof req.body?.registrationsOpen !== 'boolean') return res.status(400).json({ error: 'Estado inválido.' });
  const response = await fetch(`${url}/rest/v1/interclasse_settings`, {
    method: 'POST',
    headers: { ...headers(key), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: 'official', registrations_open: req.body.registrationsOpen, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) return res.status(502).json({ error: 'Não foi possível alterar as inscrições.' });
  return res.status(200).json({ registrationsOpen: req.body.registrationsOpen });
}
