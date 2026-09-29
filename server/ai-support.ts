import { AI_HANDBOOK, AI_SYSTEM_RULES } from './ai-handbook.js';

// AI-Support ("SkinProject Hilfe"): beantwortet Bedienungsfragen anhand der Anleitung in
// ai-handbook.ts. Läuft über /api/send-care-email mit action='support' (Vercel Hobby:
// max. 12 Functions). Benötigt ANTHROPIC_API_KEY als Vercel Environment Variable.
// Aufrufer ist bereits als eingeloggter Benutzer geprüft (siehe send-care-email.ts).

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_MESSAGES = 20;
const MAX_CHARS = 2000;

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Salon Manager',
  employee: 'Mitarbeiter',
  artist: 'Artist (Artist-App)',
};

export async function handleSupportChat(req: any, res: any) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'AI-Support ist noch nicht eingerichtet (ANTHROPIC_API_KEY fehlt in Vercel).' });
    return;
  }

  const { messages, role, page } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Keine Frage übermittelt.' });
    return;
  }

  // Nur user/assistant, gekürzt, letzte N Nachrichten -- beginnt immer mit einer user-Nachricht.
  let cleaned = messages
    .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string' && m.content.trim())
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, MAX_CHARS) }))
    .slice(-MAX_MESSAGES);
  while (cleaned.length && cleaned[0].role !== 'user') cleaned = cleaned.slice(1);
  if (!cleaned.length || cleaned[cleaned.length - 1].role !== 'user') {
    res.status(400).json({ error: 'Ungültiger Verlauf.' });
    return;
  }

  const context = `Kontext: Der Benutzer ist ${ROLE_LABELS[role] || 'unbekannte Rolle'}${page ? ` und befindet sich gerade auf der Seite "${String(page).slice(0, 80)}"` : ''}.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 900,
        system: [
          // Anleitung wird gecacht -> günstiger und schneller bei Folgefragen.
          { type: 'text', text: `${AI_SYSTEM_RULES}\n\n${AI_HANDBOOK}`, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: context },
        ],
        messages: cleaned,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      // eslint-disable-next-line no-console
      console.error('AI-Support Fehler:', response.status, body);
      res.status(502).json({ error: 'Der AI-Support ist gerade nicht erreichbar. Bitte später nochmals versuchen.' });
      return;
    }

    const data: any = await response.json();
    const answer = (data.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim();
    res.status(200).json({ answer: answer || 'Dazu habe ich leider keine Antwort. Bitte wende dich an den Admin.' });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('AI-Support Fehler:', e.message);
    res.status(500).json({ error: 'Der AI-Support ist gerade nicht erreichbar.' });
  }
}
