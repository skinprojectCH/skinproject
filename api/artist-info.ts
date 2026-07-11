import { createClient } from '@supabase/supabase-js';

// Läuft als Vercel Serverless Function unter /api/artist-info.
// Liefert nur unkritische Basisdaten (Name, ob PIN eingerichtet ist) für den
// PIN-Login-Screen der Artist-PWA — läuft VOR dem Login, daher kein RLS-Zugriff
// über den Browser-Client möglich (artists-Tabelle ist RLS-geschützt).
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const artistId = req.query?.id;
  if (!artistId || typeof artistId !== 'string') {
    res.status(400).json({ error: 'Artist-ID fehlt.' });
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
    const { data: artist, error } = await admin.from('artists').select('name, kuenstlername, status, pin_hash').eq('id', artistId).single();
    if (error || !artist) {
      res.status(404).json({ error: 'Artist nicht gefunden.' });
      return;
    }
    res.status(200).json({
      name: artist.kuenstlername || artist.name,
      active: artist.status === 'active',
      pinConfigured: !!artist.pin_hash,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
