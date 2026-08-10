import { createClient } from '@supabase/supabase-js';
import { scryptSync, timingSafeEqual, createHmac } from 'crypto';

// Läuft als Vercel Serverless Function unter /api/staff-pin-login.
// Prüft den PIN gegen admin_accounts / location_managers / artists (je nach role) und
// liefert bei Erfolg eine echte Supabase-Session (access/refresh token) zurück, die der
// Client per supabase.auth.setSession() übernimmt -- dieselbe echte Session macht RLS
// (Standort-Sichtbarkeit) serverseitig wirksam, nicht nur die UI.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { role, staffId, pin } = req.body || {};
  if (!role || !['admin', 'manager', 'employee', 'artist'].includes(role) || !staffId || !pin) {
    res.status(400).json({ error: 'Rolle, Account und PIN sind erforderlich.' });
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
    const table = role === 'admin' ? 'admin_accounts' : role === 'artist' ? 'artists' : 'location_managers';
    const { data: record, error: findError } = await admin.from(table).select('id, pin_hash, pin_salt, status').eq('id', staffId).single();
    if (findError || !record) {
      res.status(404).json({ error: 'Account nicht gefunden.' });
      return;
    }
    if (record.status !== 'active') {
      res.status(403).json({ error: 'Dieser Account ist inaktiv.' });
      return;
    }
    if (!record.pin_hash || !record.pin_salt) {
      res.status(400).json({ error: 'Für diesen Account ist noch kein PIN eingerichtet. Bitte Admin kontaktieren.' });
      return;
    }

    const attemptHash = scryptSync(String(pin), record.pin_salt, 64);
    const storedHash = Buffer.from(record.pin_hash, 'hex');
    const valid = attemptHash.length === storedHash.length && timingSafeEqual(attemptHash, storedHash);
    if (!valid) {
      res.status(401).json({ error: 'Falscher PIN.' });
      return;
    }

    const internalEmail = `${role}-${staffId}@internal.skinproject.ch`;
    const internalPassword = createHmac('sha256', serviceRoleKey).update(`${role}:${staffId}`).digest('hex');

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
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
