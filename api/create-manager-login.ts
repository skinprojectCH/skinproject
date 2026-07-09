import { createClient } from '@supabase/supabase-js';

// Läuft als Vercel Serverless Function unter /api/create-manager-login.
// Nutzt den SUPABASE_SERVICE_ROLE_KEY (ohne VITE_-Prefix -> landet NIE im Browser-Bundle).
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email, password, location_id } = req.body || {};

  if (!email || !password || !location_id) {
    res.status(400).json({ error: 'E-Mail, Passwort und Location sind erforderlich.' });
    return;
  }
  if (String(password).length < 8) {
    res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben.' });
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
    const { data: userData, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    let userId: string;

    if (createError) {
      // Existiert die E-Mail schon? Dann Passwort dieses Accounts aktualisieren,
      // statt einen Fehler zu werfen — deckt "Passwort vergessen/neu setzen" mit ab.
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
      const existing = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!existing) {
        res.status(400).json({ error: 'E-Mail ist laut Supabase bereits vergeben, aber der Account wurde nicht gefunden.' });
        return;
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, { password });
      if (updateError) {
        res.status(400).json({ error: updateError.message });
        return;
      }
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
      .upsert({ id: userId, role: 'admin', location_id }, { onConflict: 'id' });

    if (linkError) {
      res.status(400).json({ error: `Login gespeichert, aber Standort-Zuordnung fehlgeschlagen: ${linkError.message}` });
      return;
    }

    res.status(200).json({ ok: true, userId });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
