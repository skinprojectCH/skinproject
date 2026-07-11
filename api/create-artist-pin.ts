import { createClient } from '@supabase/supabase-js';
import { randomBytes, scryptSync, createHmac } from 'crypto';

// Läuft als Vercel Serverless Function unter /api/create-artist-pin.
// Setzt/ändert den PIN-Code für die Artist-PWA (aus dem Admin-Bereich "Artist bearbeiten" aufgerufen).
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { artistId, pin } = req.body || {};

  if (!artistId || !pin) {
    res.status(400).json({ error: 'Artist und PIN sind erforderlich.' });
    return;
  }
  if (!/^\d{4,6}$/.test(String(pin))) {
    res.status(400).json({ error: 'PIN muss 4 bis 6 Ziffern haben.' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'Server nicht korrekt konfiguriert (SUPABASE_SERVICE_ROLE_KEY fehlt in Vercel).' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { data: artist, error: artistError } = await admin.from('artists').select('id, location_id').eq('id', artistId).single();
    if (artistError || !artist) {
      res.status(404).json({ error: 'Artist nicht gefunden.' });
      return;
    }

    // Verstecktes Auth-Konto hinter dem PIN: deterministisches Passwort, nur
    // aus artistId + Service-Role-Key ableitbar, wird nie an den Client geschickt.
    const internalEmail = `artist-${artistId}@internal.skinproject.ch`;
    const internalPassword = createHmac('sha256', serviceRoleKey).update(artistId).digest('hex');

    const { data: userData, error: createError } = await admin.auth.admin.createUser({
      email: internalEmail,
      password: internalPassword,
      email_confirm: true,
    });

    let userId: string;
    if (createError) {
      const alreadyExists = createError.message?.toLowerCase().includes('already') || (createError as any).status === 422;
      if (!alreadyExists) {
        res.status(400).json({ error: createError.message });
        return;
      }
      const { data: listData, error: listError } = await admin.auth.admin.listUsers();
      if (listError) {
        res.status(400).json({ error: listError.message });
        return;
      }
      const existing = listData.users.find((u) => u.email?.toLowerCase() === internalEmail.toLowerCase());
      if (!existing) {
        res.status(400).json({ error: 'Internes Konto ist laut Supabase bereits vergeben, wurde aber nicht gefunden.' });
        return;
      }
      // Passwort sicherstellen (falls Service-Role-Key seit Erstellung rotiert wurde).
      await admin.auth.admin.updateUserById(existing.id, { password: internalPassword });
      userId = existing.id;
    } else {
      if (!userData.user) {
        res.status(400).json({ error: 'Account konnte nicht erstellt werden.' });
        return;
      }
      userId = userData.user.id;
    }

    const { error: linkError } = await admin
      .from('app_users')
      .upsert({ id: userId, role: 'artist', artist_id: artistId, location_id: artist.location_id }, { onConflict: 'id' });
    if (linkError) {
      res.status(400).json({ error: `PIN gespeichert, aber Verknüpfung fehlgeschlagen: ${linkError.message}` });
      return;
    }

    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(String(pin), salt, 64).toString('hex');
    const { error: pinError } = await admin.from('artists').update({ pin_hash: hash, pin_salt: salt }).eq('id', artistId);
    if (pinError) {
      res.status(400).json({ error: pinError.message });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
