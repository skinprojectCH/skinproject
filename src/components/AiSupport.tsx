import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// "SkinProject Hilfe": schwebender Hilfe-Button unten rechts mit AI-Chat, der die
// Bedienung erklärt (Wissensbasis: server/ai-handbook.ts). Verlauf nur im Speicher.

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS: Record<string, string[]> = {
  artist: ['Wie erfasse ich einen neuen Termin?', 'Wo sehe ich meinen Verdienst?', 'Wie ändere ich meinen PIN?'],
  default: ['Wie mache ich einen Kassensturz?', 'Kunde zahlt erst morgen – was tun?', 'Wie löse ich einen Gutschein ein?', 'Wie sende ich die Quittung per E-Mail?'],
};

function pageLabel(path: string) {
  if (path.startsWith('/kalender')) return 'Kalender';
  if (path.startsWith('/kasse')) return 'Kasse';
  if (path.startsWith('/kunden/')) return 'Kundenprofil';
  if (path.startsWith('/kunden')) return 'Kunden';
  if (path.startsWith('/admin/abrechnung')) return 'Abrechnung';
  if (path.startsWith('/admin/statistiken')) return 'Statistiken';
  if (path.startsWith('/admin/artists')) return 'Settings → Artists';
  if (path.startsWith('/admin/schichtplan')) return 'Settings → Schichtplan';
  if (path.startsWith('/admin/absenzen')) return 'Settings → Absenzen';
  if (path.startsWith('/admin/locations')) return 'Settings → Locations';
  if (path.startsWith('/admin/einstellungen')) return 'Settings → E-Mail & Pflege';
  if (path.startsWith('/admin/gutscheine')) return 'Gutscheine';
  if (path.startsWith('/admin/anzahlungen')) return 'Anzahlungen';
  if (path.startsWith('/admin/produkte')) return 'Produkte';
  if (path.startsWith('/admin/dienstleistungen')) return 'Dienstleistungen';
  if (path.startsWith('/artist/')) return 'Artist-App';
  return path;
}

// Minimales, sicheres Markdown: escapen, dann **fett**, Listen und Zeilenumbrüche.
function renderAnswer(text: string) {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = esc
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^#{1,4}\s*(.+)$/gm, '<strong>$1</strong>')
    .replace(/^\s*[-•]\s+(.+)$/gm, '<div style="padding-left:12px;text-indent:-10px;">• $1</div>')
    .replace(/^\s*(\d+)\.\s+(.+)$/gm, '<div style="padding-left:16px;text-indent:-14px;">$1. $2</div>')
    .replace(/\n(?!<div)/g, '<br/>');
  return { __html: html };
}

export default function AiSupport({ role, bottomOffset = 0 }: { role: string | null; bottomOffset?: number }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending, open]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || sending) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setInput('');
    setSending(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch('/api/send-care-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action: 'support', messages: next, role, page: pageLabel(window.location.pathname) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Keine Antwort erhalten.');
      setMessages([...next, { role: 'assistant', content: body.answer }]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  const suggestions = SUGGESTIONS[role === 'artist' ? 'artist' : 'default'];

  // Hilfe-Button erst anzeigen, wenn in Vercel VITE_AI_SUPPORT=true gesetzt ist
  // (zusammen mit ANTHROPIC_API_KEY). Bis dahin unsichtbar.
  if (import.meta.env.VITE_AI_SUPPORT !== 'true') return null;

  return (
    <div className="kasse-no-print">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="SkinProject Hilfe"
          style={{
            position: 'fixed',
            right: 20,
            bottom: 20 + bottomOffset,
            zIndex: 900,
            height: 44,
            padding: '0 16px 0 12px',
            borderRadius: 22,
            border: 'none',
            background: '#111',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
          }}
        >
          <span style={{ width: 22, height: 22, borderRadius: 11, background: '#fff', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>?</span>
          Hilfe
        </button>
      )}

      {open && (
        <div
          style={{
            position: 'fixed',
            right: 16,
            bottom: 16 + bottomOffset,
            zIndex: 900,
            width: 'min(380px, calc(100vw - 32px))',
            height: `min(560px, calc(100vh - ${32 + bottomOffset}px))`,
            background: 'var(--color-surface, #fff)',
            border: '1px solid var(--color-border, #ddd)',
            borderRadius: 10,
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#111', color: '#fff' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>SkinProject Hilfe</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>AI-Assistent · erklärt die Bedienung</div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {messages.length > 0 && (
                <button onClick={() => { setMessages([]); setError(null); }} style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.7, fontSize: 11, cursor: 'pointer' }}>
                  Neu
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, lineHeight: 1, cursor: 'pointer' }} aria-label="Schliessen">
                ×
              </button>
            </div>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div>
                <div style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>Hallo! Frag mich alles zur Bedienung von SkinProject, z.B.:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      style={{ textAlign: 'left', border: '1px solid var(--color-border, #ddd)', background: 'transparent', borderRadius: 16, padding: '7px 12px', fontSize: 12, cursor: 'pointer', color: 'inherit' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} style={{ alignSelf: 'flex-end', maxWidth: '85%', background: '#111', color: '#fff', padding: '8px 12px', borderRadius: '12px 12px 2px 12px', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                  {m.content}
                </div>
              ) : (
                <div
                  key={i}
                  style={{ alignSelf: 'flex-start', maxWidth: '92%', background: 'var(--color-bg, #f3f1ec)', padding: '9px 12px', borderRadius: '12px 12px 12px 2px', fontSize: 13, lineHeight: 1.5 }}
                  dangerouslySetInnerHTML={renderAnswer(m.content)}
                />
              )
            )}
            {sending && <div style={{ alignSelf: 'flex-start', fontSize: 12, color: '#999' }}>Schreibt…</div>}
            {error && <div style={{ fontSize: 12, color: 'var(--color-destructive, #b00)' }}>{error}</div>}
          </div>

          <div style={{ borderTop: '1px solid var(--color-border, #ddd)', padding: 10, display: 'flex', gap: 8 }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Frage eingeben…"
              rows={1}
              style={{ flex: 1, resize: 'none', border: '1px solid var(--color-border, #ddd)', borderRadius: 6, padding: '9px 10px', fontSize: 13, fontFamily: 'var(--font-body)', maxHeight: 90 }}
            />
            <button className="btn btn-primary" disabled={sending || !input.trim()} onClick={() => send(input)} style={{ opacity: sending || !input.trim() ? 0.5 : 1 }}>
              Senden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
