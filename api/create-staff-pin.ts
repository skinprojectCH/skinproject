import { createClient } from '@supabase/supabase-js';
import { randomBytes, scryptSync, createHmac } from 'crypto';

// Läuft als Vercel Serverless Function unter /api/create-staff-pin.
// Setzt/ändert den PIN-Code für Admin, Manager, Angestellte oder Artist -- ersetzt die
// früheren getrennten Endpoints create-manager-login (E-Mail/Passwort) und
// create-artist-pin. Nutzt für alle Rollen dasselbe Muster: ein verstecktes Supabase-
// Auth-Konto mit deterministischem, nie exponiertem Passwort dahinter, der PIN ist die
// einzige nutzer-sichtbare Hürde (siehe auch staff-pin-login.ts).
//
// role='admin' ohne staffId legt einen neuen Admin-Account an (vorname/name nötig).
// role='manager'|'employee' braucht eine existierende location_managers-Zeile (staffId).
// role='artist' braucht eine existierende artists-Zeile (staffId).
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { role, staffId, pin, vorname, name } = req.body || {};
  if (!role || !['admin', 'manager', 'employee', 'artist'].includes(role)) {
    res.status(400).json({ error: 'Ungültige Rolle.' });
    return;
  }
  if (!pin || !/^\d{4,6}$/.test(String(pin))) {
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
    let recordId = staffId as string | undefined;
    let locationId: string | null = null;

    if (role === 'admin') {
      if (recordId) {
        const { data: existingAdmin, error: findError } = await admin.from('admin_accounts').select('id').eq('id', recordId).single();
        if (findError || !existingAdmin) {
          res.status(404).json({ error: 'Admin-Account nicht gefunden.' });
          return;
        }
      } else {
        if (!vorname || !name) {
          res.status(400).json({ error: 'Vorname und Name sind für einen neuen Admin-Account erforderlich.' });
          return;
        }
        const { data: created, error: createRowError } = await admin.from('admin_accounts').insert({ vorname, name }).select('id').single();
        if (createRowError || !created) {
          res.status(400).json({ error: createRowError?.message || 'Admin-Account konnte nicht angelegt werden.' });
          return;
        }
        recordId = created.id;
      }
    } else if (role === 'manager' || role === 'employee') {
      if (!recordId) {
        res.status(400).json({ error: 'staffId (location_managers.id) fehlt.' });
        return;
      }
      const { data: manager, error: findError } = await admin.from('location_managers').select('id, location_id').eq('id', recordId).single();
      if (findError || !manager) {
        res.status(404).json({ error: 'Teammitglied nicht gefunden.' });
        return;
      }
      locationId = manager.location_id;
      const { error: roleUpdateError } = await admin.from('location_managers').update({ role }).eq('id', recordId);
      if (roleUpdateError) {
        res.status(400).json({ error: roleUpdateError.message });
        return;
      }
    } else {
      // artist
      if (!recordId) {
        res.status(400).json({ error: 'staffId (artists.id) fehlt.' });
        return;
      }
      const { data: artist, error: findError } = await admin.from('artists').select('id, location_id').eq('id', recordId).single();
      if (findError || !artist) {
        res.status(404).json({ error: 'Artist nicht gefunden.' });
        return;
      }
      locationId = artist.location_id;
    }

    // Verstecktes Auth-Konto hinter dem PIN: deterministisches Passwort, nur aus
    // role+recordId+Service-Role-Key ableitbar, wird nie an den Client geschickt.
    const internalEmail = `${role}-${recordId}@internal.skinproject.ch`;
    const internalPassword = createHmac('sha256', serviceRoleKey).update(`${role}:${recordId}`).digest('hex');

    const { data: userData, error: createUserError } = await admin.auth.admin.createUser({
      email: internalEmail,
      password: internalPassword,
      email_confirm: true,
    });

    let userId: string;
    if (createUserError) {
      const alreadyExists = createUserError.message?.toLowerCase().includes('already') || (createUserError as any).status === 422;
      if (!alreadyExists) {
        res.status(400).json({ error: createUserError.message });
        return;
      }
      const { data: listData, error: listError } = await admin.auth.admin.listUsers();
      if (listError) {
        res.status(400).json({ error: listError.message });
        return;
      }
      const existing = listData.users.find((u: any) => u.email?.toLowerCase() === internalEmail.toLowerCase());
      if (!existing) {
        res.status(400).json({ error: 'Internes Konto ist laut Supabase bereits vergeben, wurde aber nicht gefunden.' });
        return;
      }
      await admin.auth.admin.updateUserById(existing.id, { password: internalPassword });
      userId = existing.id;
    } else {
      if (!userData.user) {
        res.status(400).json({ error: 'Account konnte nicht erstellt werden.' });
        return;
      }
      userId = userData.user.id;
    }

    const appUserRow: Record<string, any> = { id: userId, role, location_id: locationId };
    if (role === 'admin') appUserRow.admin_account_id = recordId;
    if (role === 'manager' || role === 'employee') appUserRow.manager_id = recordId;
    if (role === 'artist') appUserRow.artist_id = recordId;

    const { error: linkError } = await admin.from('app_users').upsert(appUserRow, { onConflict: 'id' });
    if (linkError) {
      res.status(400).json({ error: `PIN gespeichert, aber Verknüpfung fehlgeschlagen: ${linkError.message}` });
      return;
    }

    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(String(pin), salt, 64).toString('hex');
    const table = role === 'admin' ? 'admin_accounts' : role === 'artist' ? 'artists' : 'location_managers';
    const { error: pinError } = await admin.from(table).update({ pin_hash: hash, pin_salt: salt }).eq('id', recordId);
    if (pinError) {
      res.status(400).json({ error: pinError.message });
      return;
    }

    res.status(200).json({ ok: true, staffId: recordId });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
