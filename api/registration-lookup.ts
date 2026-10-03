import { createClient } from '@supabase/supabase-js';

function normalizePhone(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  const hasExplicitCountryCode = trimmed.startsWith('+');
  let digits = trimmed.replace(/[^\d+]/g, '').replace(/\+/g, '');
  if (hasExplicitCountryCode) {
    if (digits.startsWith('410')) digits = '41' + digits.slice(3); // "+41 079…" -> führende 0 weg
    return digits ? `+${digits}` : '';
  }
  if (digits.startsWith('0041')) digits = digits.slice(2);
  else if (digits.startsWith('41')) {
    // schon mit Landesvorwahl
  } else if (digits.startsWith('0')) digits = '41' + digits.slice(1);
  else if (digits.length > 0) digits = '41' + digits;
  if (digits.startsWith('410')) digits = '41' + digits.slice(3); // "+41 079…" -> führende 0 weg
  return digits ? `+${digits}` : '';
}

// Läuft als Vercel Serverless Function unter /api/registration-lookup.
// N1: prüft anhand der Telefonnummer, ob der Kunde schon existiert, damit er
// beim Registrieren nicht alles neu eintippen muss.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { phone, customerId } = req.body || {};
  const normalized = normalizePhone(phone || '');
  if (!normalized) {
    res.status(400).json({ error: 'Telefonnummer fehlt.' });
    return;
  }
  // Unvollständige Nummern (z.B. "+41" oder "+4149212" aus dem Import) würden fremde
  // Personen anzeigen -> mindestens Landesvorwahl + 8 Ziffern verlangen.
  if (normalized.replace(/\D/g, '').length < 10) {
    res.status(400).json({ error: 'Bitte die vollständige Telefonnummer eingeben, z.B. 079 123 45 67.' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'Server nicht korrekt konfiguriert.' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const FIELDS = 'id, vorname, name, email, phone, parent_phone, birthdate, strasse, plz_ort, whatsapp_opt_in, werbung_opt_in, created_at';

  try {
    // Alle Personen unter dieser Nummer: eigene Nummer ODER als Eltern-Nummer hinterlegt
    // (Kinder ohne Handy). Mehrere Treffer sind normal (Familie, Duplikate).
    const { data: matches, error } = await admin
      .from('customers')
      .select(FIELDS)
      .or(`phone.eq.${normalized},parent_phone.eq.${normalized}`)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    const list = (matches as any[]) || [];

    // Schritt 2: konkrete Person gewählt -> deren Daten (nur wenn sie zu dieser Nummer gehört).
    if (customerId) {
      const customer = list.find((c) => c.id === customerId);
      if (!customer) {
        res.status(404).json({ error: 'Person nicht gefunden.' });
        return;
      }
      res.status(200).json({ found: true, customer });
      return;
    }

    if (list.length === 0) {
      res.status(200).json({ found: false, normalizedPhone: normalized, people: [] });
      return;
    }

    // Gleiche Person mehrfach (Duplikate) nur einmal anzeigen: pro Vor-/Nachname den
    // Eintrag mit den meisten Angaben (bei Gleichstand den neusten).
    const score = (c: any) => ['email', 'birthdate', 'strasse', 'plz_ort'].filter((k) => c[k]).length;
    const byName = new Map<string, any>();
    for (const c of list) {
      const key = `${(c.vorname || '').trim().toLowerCase()}|${(c.name || '').trim().toLowerCase()}`;
      const prev = byName.get(key);
      if (!prev || score(c) > score(prev)) byName.set(key, c);
    }
    // Datenschutz: nur Vorname + Initiale des Nachnamens zurückgeben.
    const people = [...byName.values()].map((c) => ({
      id: c.id,
      label: `${(c.vorname || '').trim()} ${(c.name || '').trim().charAt(0).toUpperCase()}.`.trim(),
    }));
    res.status(200).json({ found: true, normalizedPhone: normalized, people });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
