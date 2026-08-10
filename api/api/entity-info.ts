import { createClient } from '@supabase/supabase-js';

// Läuft als Vercel Serverless Function unter /api/entity-info.
// Fasst die früheren separaten Endpoints artist-info und location-info zusammen
// (Vercel Hobby-Plan erlaubt max. 12 Serverless Functions pro Deployment) --
// liefert je nach ?type=artist|location nur unkritische Basisdaten für Screens,
// die vor dem Login laufen (RLS-geschützte Tabellen, daher Service-Role-Zugriff).
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const type = req.query?.type;
  const id = req.query?.id;
  if (!id || typeof id !== 'string' || (type !== 'artist' && type !== 'location')) {
    res.status(400).json({ error: 'type (artist|location) und id sind erforderlich.' });
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
    if (type === 'artist') {
      const { data: artist, error } = await admin.from('artists').select('name, kuenstlername, status, pin_hash').eq('id', id).single();
      if (error || !artist) {
        res.status(404).json({ error: 'Artist nicht gefunden.' });
        return;
      }
      res.status(200).json({
        name: artist.kuenstlername || artist.name,
        active: artist.status === 'active',
        pinConfigured: !!artist.pin_hash,
      });
      return;
    }

    const { data: location, error } = await admin.from('locations').select('id, name').eq('id', id).single();
    if (error || !location) {
      res.status(404).json({ error: 'Location nicht gefunden.' });
      return;
    }
    res.status(200).json({ location });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
