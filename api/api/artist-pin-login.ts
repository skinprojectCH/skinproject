import { createClient } from '@supabase/supabase-js';
import { scryptSync, timingSafeEqual, createHmac } from 'crypto';

// Läuft als Vercel Serverless Function unter /api/artist-pin-login.
// Prüft den PIN und liefert bei Erfolg eine echte Supabase-Session (access/refresh token)
// zurück, die der Client per supabase.auth.setSession() übernimmt.
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

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'Server nicht korrekt konfiguriert.' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { data: artist, error: artistError } = await admin
      .from('artists')
      .select('id, name, pin_hash, pin_salt, status, is_employee')
      .eq('id', artistId)
      .single();

    if (artistError || !artist) {
      res.status(404).json({ error: 'Artist nicht gefunden.' });
      return;
    }
    if (artist.status !== 'active') {
      res.status(403).json({ error: 'Dieser Account ist inaktiv.' });
      return;
    }
    if (!artist.pin_hash || !artist.pin_salt) {
      res.status(400).json({ error: 'Für diesen Artist ist noch kein PIN eingerichtet. Bitte Admin kontaktieren.' });
      return;
    }

    const attemptHash = scryptSync(String(pin), artist.pin_salt, 64);
    const storedHash = Buffer.from(artist.pin_hash, 'hex');
    const valid = attemptHash.length === storedHash.length && timingSafeEqual(attemptHash, storedHash);
    if (!valid) {
      res.status(401).json({ error: 'Falscher PIN.' });
      return;
    }

    const internalEmail = `artist-${artistId}@internal.skinproject.ch`;
    const internalPassword = createHmac('sha256', serviceRoleKey).update(artistId).digest('hex');

    const { data: sessionData, error: sessionError } = await admin.auth.signInWithPassword({
      email: internalEmail,
      password: internalPassword,
    });
    if (sessionError || !sessionData.session) {
      res.status(400).json({ error: 'Login fehlgeschlagen, bitte Admin kontaktieren.' });
      return;
    }

    res.status(200).json({
      ok: true,
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      artist: { id: artist.id, name: artist.name },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
