import { createClient } from '@supabase/supabase-js';

// Läuft als Vercel Serverless Function unter /api/registration-save-profile.
// Wird in N2 (Kundendaten) und N3 (Geburtsdatum) aufgerufen. Legt beim ersten
// Aufruf (ohne customerId) einen neuen Kunden an, danach wird per customerId
// nachgeführt (upsert-artig, aber ohne Konflikt-Handling da customerId aus
// der Response des ersten Aufrufs stammt).
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { customerId, locationId, patch } = req.body || {};
  if (!patch || typeof patch !== 'object') {
    res.status(400).json({ error: 'Angaben fehlen.' });
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
    if (customerId) {
      const { error } = await admin.from('customers').update(patch).eq('id', customerId);
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(200).json({ ok: true, customerId });
      return;
    }

    if (!locationId) {
      res.status(400).json({ error: 'Location fehlt.' });
      return;
    }
    if (!patch.vorname?.trim() || !patch.name?.trim()) {
      res.status(400).json({ error: 'Vorname und Name sind erforderlich.' });
      return;
    }
    const { data: location, error: locError } = await admin.from('locations').select('id').eq('id', locationId).single();
    if (locError || !location) {
      res.status(404).json({ error: 'Location nicht gefunden.' });
      return;
    }
    const { data: created, error: createError } = await admin.from('customers').insert(patch).select('id').single();
    if (createError || !created) {
      res.status(400).json({ error: createError?.message || 'Kunde konnte nicht angelegt werden.' });
      return;
    }
    res.status(200).json({ ok: true, customerId: created.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
