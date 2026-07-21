import { useEffect, useRef, useState } from 'react';

const card: React.CSSProperties = { width: '100%', maxWidth: 420, margin: '0 auto', background: '#fff', borderRadius: 20, overflow: 'hidden', fontFamily: "'Work Sans', sans-serif", boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const cardInner: React.CSSProperties = { padding: 28, textAlign: 'center' };
const primaryBtn: React.CSSProperties = { background: '#111', color: '#fff', textAlign: 'center', padding: 14, fontSize: 14, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%' };

interface VoucherInfo {
  code: string;
  value: number;
  buyer_name: string | null;
  created_at: string;
}

async function downloadVoucherPdf(voucher: VoucherInfo) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  // Rahmen
  doc.setDrawColor(176, 141, 61);
  doc.setLineWidth(1);
  doc.rect(12, 12, 186, 100);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SKINPROJECT', 105, 35, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Tattoo & Piercing', 105, 43, { align: 'center' });

  doc.setFontSize(14);
  doc.text('Gutschein', 105, 58, { align: 'center' });

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(`CHF ${voucher.value.toFixed(2)}`, 105, 74, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Code: ${voucher.code}`, 105, 88, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('Einlösbar an jedem SkinProject-Standort.', 105, 100, { align: 'center' });

  doc.save(`SkinProject_Gutschein_${voucher.code}.pdf`);
}

export default function GutscheinErfolg() {
  const [voucher, setVoucher] = useState<VoucherInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const attempts = useRef(0);

  const sessionId = new URLSearchParams(window.location.search).get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setError('Keine Zahlungs-Session gefunden.');
      return;
    }

    let cancelled = false;

    function poll() {
      fetch(`/api/voucher-checkout-status?session_id=${encodeURIComponent(sessionId!)}`)
        .then((r) => r.json())
        .then((body) => {
          if (cancelled) return;
          if (body.ready) {
            setVoucher(body.voucher);
            return;
          }
          attempts.current += 1;
          if (attempts.current > 15) {
            setError('Die Zahlung wird noch verarbeitet. Bitte lade die Seite in ein paar Sekunden neu.');
            return;
          }
          setTimeout(poll, 1500);
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '40px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div style={card}>
        <div style={cardInner}>
          {!voucher && !error && (
            <>
              <div style={{ fontSize: 14, color: '#777', marginTop: 30, marginBottom: 30 }}>Zahlung wird bestätigt…</div>
            </>
          )}

          {error && !voucher && <div style={{ fontSize: 13, color: 'var(--color-destructive)', marginTop: 20 }}>{error}</div>}

          {voucher && (
            <>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '10px auto 20px' }}>✓</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Zahlung erfolgreich!</div>
              <div style={{ fontSize: 12, color: '#777', marginBottom: 24 }}>Dein Gutschein ist bereit zum Download.</div>

              <div style={{ border: '1.5px solid var(--color-accent)', borderRadius: 12, padding: '20px 16px', marginBottom: 22 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#999', marginBottom: 6 }}>Gutschein</div>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 6 }}>CHF {voucher.value.toFixed(2)}</div>
                <div style={{ fontSize: 13, color: '#555', fontFamily: 'monospace' }}>{voucher.code}</div>
              </div>

              <button style={primaryBtn} onClick={() => downloadVoucherPdf(voucher)}>
                Gutschein herunterladen (PDF)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
