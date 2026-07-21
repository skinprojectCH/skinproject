import { createClient } from '@supabase/supabase-js';

// Läuft als Vercel Serverless Function unter /api/voucher-checkout-status.
// Die Erfolgsseite pollt hiermit kurz, bis der Stripe-Webhook den Gutschein angelegt hat.
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const sessionId = req.query?.session_id;
  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ error: 'session_id fehlt.' });
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
    const { data: voucher, error } = await admin
      .from('vouchers')
      .select('code, value, buyer_name, created_at')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (!voucher) {
      res.status(200).json({ ready: false });
      return;
    }
    res.status(200).json({ ready: true, voucher });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
