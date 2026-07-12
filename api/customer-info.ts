import { createClient } from '@supabase/supabase-js';

// Läuft als Vercel Serverless Function unter /api/customer-info.
// Liefert nur unkritische Basisdaten (Name) für den öffentlichen Registrierungs-Link —
// die customers-Tabelle ist RLS-geschützt (nur "authenticated"), daher kein direkter
// Zugriff über den Browser-Client möglich, bevor sich der Kunde "identifiziert" hat.
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const customerId = req.query?.id;
  if (!customerId || typeof customerId !== 'string') {
    res.status(400).json({ error: 'Kunden-ID fehlt.' });
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
      .select('vorname, name, email, phone, birthdate, strasse, plz_ort')
      .eq('id', customerId)
      .single();
    if (error || !customer) {
      res.status(404).json({ error: 'Kunde nicht gefunden.' });
      return;
    }
    res.status(200).json({ customer });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
