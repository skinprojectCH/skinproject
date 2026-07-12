import { createClient } from '@supabase/supabase-js';

function normalizePhone(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  let digits = trimmed.replace(/[^\d+]/g, '').replace(/\+/g, '');
  if (digits.startsWith('0041')) digits = digits.slice(2);
  else if (digits.startsWith('41')) {
    // schon mit Landesvorwahl
  } else if (digits.startsWith('0')) digits = '41' + digits.slice(1);
  else if (digits.length > 0) digits = '41' + digits;
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

  const { phone } = req.body || {};
  const normalized = normalizePhone(phone || '');
  if (!normalized) {
    res.status(400).json({ error: 'Telefonnummer fehlt.' });
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
    const { data: customer, error } = await admin
      .from('customers')
      .select('id, vorname, name, email, phone, birthdate, strasse, plz_ort')
      .eq('phone', normalized)
      .maybeSingle();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (!customer) {
      res.status(200).json({ found: false, normalizedPhone: normalized });
      return;
    }
    res.status(200).json({ found: true, customer });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
