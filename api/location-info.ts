import { createClient } from '@supabase/supabase-js';

// Läuft als Vercel Serverless Function unter /api/location-info.
// Liefert nur den Location-Namen für die Begrüssung auf dem öffentlichen
// Registrierungs-Link (locations-Tabelle ist RLS-geschützt).
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const locationId = req.query?.id;
  if (!locationId || typeof locationId !== 'string') {
    res.status(400).json({ error: 'Location-ID fehlt.' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'Server nicht korrekt konfiguriert.' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { data: location, error } = await admin.from('locations').select('id, name').eq('id', locationId).single();
    if (error || !location) {
      res.status(404).json({ error: 'Location nicht gefunden.' });
      return;
    }
    res.status(200).json({ location });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
