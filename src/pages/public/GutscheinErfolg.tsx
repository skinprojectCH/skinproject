import { useEffect, useRef, useState } from 'react';

const card: React.CSSProperties = { width: '100%', maxWidth: 420, margin: '0 auto', background: '#fff', borderRadius: 20, overflow: 'hidden', fontFamily: "'Work Sans', sans-serif", boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const cardInner: React.CSSProperties = { padding: 28, textAlign: 'center' };
const primaryBtn: React.CSSProperties = { background: '#111', color: '#fff', textAlign: 'center', padding: 14, fontSize: 14, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%' };
const secondaryBtn: React.CSSProperties = { background: 'transparent', color: '#111', textAlign: 'center', padding: 14, fontSize: 14, fontWeight: 600, borderRadius: 8, border: '1.5px solid #ddd', cursor: 'pointer', width: '100%' };

interface VoucherInfo {
  code: string;
  value: number;
  buyer_name: string | null;
  created_at: string;
  type: 'gutschein' | 'anzahlung';
  campaign: string | null;
  deal_full_coverage: boolean;
}

function loadImageAsDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas nicht verfügbar.'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Logo konnte nicht geladen werden.'));
    img.src = src;
  });
}

async function downloadHalloweenTicketPdf(voucher: VoucherInfo) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  // Nur die Karte selbst ist dunkel eingefärbt (abgerundetes Rechteck), der Rest der A4-Seite
  // bleibt weiss -- beim Ausdrucken (z.B. zuhause vom Kunden) deutlich weniger Tintenverbrauch
  // als eine komplett schwarz gefüllte Seite.
  const cardX = 12;
  const cardY = 20;
  const cardW = 186;
  const cardH = 178;

  doc.setFillColor(20, 16, 16);
  doc.roundedRect(cardX, cardY, cardW, cardH, 6, 6, 'F');
  doc.setDrawColor(255, 140, 26);
  doc.setLineWidth(1);
  doc.roundedRect(cardX, cardY, cardW, cardH, 6, 6, 'S');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('HALLOWEEN', 105, 48, { align: 'center' });
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 184, 154);
  doc.text('S P E C I A L', 105, 58, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('HALLOWEEN PIERCING SPECIAL', 105, 74, { align: 'center' });

  doc.setFontSize(34);
  doc.setTextColor(255, 140, 26);
  doc.text(`NUR CHF ${voucher.value.toFixed(2)}.–`, 105, 90, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 184, 154);
  doc.text('1x Piercing deiner Wahl inkl. Titanschmuck — jederzeit einlösbar.', 105, 100, { align: 'center' });

  doc.setFontSize(13);
  doc.setFont('courier', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`Code: ${voucher.code}`, 105, 114, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 184, 154);
  doc.text(`Gekauft am: ${new Date(voucher.created_at).toLocaleDateString('de-CH')}`, 105, 122, { align: 'center' });
  doc.text('SkinProject Zürich Oerlikon & Wädenswil', 105, 129, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(150, 135, 120);
  doc.text('Ausgenommen Intim- und Wohlfühl-Piercings. Es gelten unsere Altersregelungen.', 105, 138, { align: 'center' });

  try {
    // logo-email.png (quadratisches Logo mit QR-Element) hat einen weissen Hintergrund --
    // daher auf einem eigenen weissen Chip platziert, statt direkt auf der dunklen Karte.
    const logoDataUrl = await loadImageAsDataUrl('/logo-email.png');
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(90, 148, 30, 42, 3, 3, 'F');
    doc.addImage(logoDataUrl, 'PNG', 93, 151, 24, 36.02);
  } catch {
    // Logo ist rein dekorativ -- Download soll nicht daran scheitern, falls es nicht lädt.
  }

  doc.save(`SkinProject_Halloween-Ticket_${voucher.code}.pdf`);
}

async function downloadVoucherPdf(voucher: VoucherInfo) {
  if (voucher.deal_full_coverage) {
    await downloadHalloweenTicketPdf(voucher);
    return;
  }

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const isAnzahlung = voucher.type === 'anzahlung';

  // Rahmen
  doc.setDrawColor(176, 141, 61);
  doc.setLineWidth(1);
  doc.rect(12, 12, 186, 105);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SKINPROJECT', 105, 35, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Tattoo & Piercing', 105, 43, { align: 'center' });

  doc.setFontSize(14);
  doc.text(isAnzahlung ? 'Bestätigung Anzahlung' : 'Gutschein', 105, 58, { align: 'center' });

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(`CHF ${voucher.value.toFixed(2)}`, 105, 74, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Code: ${voucher.code}`, 105, 88, { align: 'center' });

  doc.setFontSize(9);
  doc.text(`${isAnzahlung ? 'Bezahlt am' : 'Gekauft am'}: ${new Date(voucher.created_at).toLocaleDateString('de-CH')}`, 105, 96, { align: 'center' });

  doc.setTextColor(120);
  doc.text(isAnzahlung ? 'Einsetzbar bei deinem nächsten Termin.' : 'Einlösbar an jedem SkinProject-Standort.', 105, 104, { align: 'center' });

  doc.save(`SkinProject_${isAnzahlung ? 'Anzahlung' : 'Gutschein'}_${voucher.code}.pdf`);
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

  const isAnzahlung = voucher?.type === 'anzahlung';
  const isHalloween = !!voucher?.deal_full_coverage;

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
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                {isHalloween ? '🎃 Zahlung erfolgreich!' : 'Zahlung erfolgreich!'}
              </div>
              <div style={{ fontSize: 12, color: '#777', marginBottom: 24 }}>
                {isHalloween
                  ? 'Dein Halloween-Ticket ist bereit zum Download — jederzeit einlösbar für 1x Piercing deiner Wahl inkl. Titanschmuck.'
                  : isAnzahlung
                    ? 'Deine Anzahlung wurde deinem Kundenprofil gutgeschrieben.'
                    : 'Dein Gutschein ist bereit zum Download.'}
              </div>

              <div
                style={{
                  border: isHalloween ? 'none' : '1.5px solid var(--color-accent)',
                  background: isHalloween ? 'radial-gradient(circle at 50% 0%, #2b2220 0%, #141010 70%)' : undefined,
                  color: isHalloween ? '#f1e9e0' : undefined,
                  borderRadius: 12,
                  padding: '20px 16px',
                  marginBottom: 22,
                }}
              >
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: isHalloween ? '#cbb89a' : '#999', marginBottom: 6 }}>
                  {isHalloween ? 'Halloween Piercing Special' : isAnzahlung ? 'Anzahlung' : 'Gutschein'}
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 6, color: isHalloween ? '#ff8c1a' : undefined }}>
                  CHF {voucher.value.toFixed(2)}
                </div>
                <div style={{ fontSize: 13, color: isHalloween ? '#f1e9e0' : '#555', fontFamily: 'monospace' }}>{voucher.code}</div>
                {isHalloween && (
                  <div style={{ fontSize: 11, color: '#9a8a7a', marginTop: 10, lineHeight: 1.5 }}>
                    Ausgenommen Intim- und Wohlfühl-Piercings. Es gelten unsere Altersregelungen.
                  </div>
                )}
              </div>

              <button style={isHalloween ? { ...primaryBtn, background: '#ff8c1a', color: '#1a1510' } : primaryBtn} onClick={() => downloadVoucherPdf(voucher)}>
                {isHalloween ? 'Ticket herunterladen (PDF)' : isAnzahlung ? 'Bestätigung herunterladen (PDF)' : 'Gutschein herunterladen (PDF)'}
              </button>

              <a href="/gutschein-kaufen" style={{ ...secondaryBtn, display: 'block', marginTop: 12, textDecoration: 'none' }}>
                {isAnzahlung ? 'Weitere Gutscheine/Anzahlungen tätigen' : 'Weitere Gutscheine kaufen'}
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
