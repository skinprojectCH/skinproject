import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

type Step = 'phone' | 'kundendaten' | 'geburtsdatum' | 'ausweis' | 'gesundheit' | 'unterschrift' | 'einverstaendnis' | 'einverstaendnis-detail' | 'fertig';

const GENERAL_QUESTIONS = [
  { key: 'pregnant', label: 'Schwanger' },
  { key: 'breastfeeding', label: 'In der Stillzeit' },
  { key: 'epilepsy', label: 'Epilepsie' },
  { key: 'hiv_aids', label: 'HIV / AIDS' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'hepatitis', label: 'Hepatitis' },
];

// Diese 4 haben ein Detail-Feld UND werden bei "Ja" oben rechts im Kundenprofil angezeigt.
const FLAGGED_QUESTIONS = [
  { key: 'skin_conditions', label: 'Hautkrankheiten / Narben', placeholder: 'Details (welche/wo)…', noticeLabel: 'Hautkrankheiten/Narben' },
  { key: 'heart_circulation', label: 'Herz-/Kreislaufprobleme', placeholder: 'Details…', noticeLabel: 'Herz-/Kreislaufprobleme' },
  { key: 'allergies', label: 'Allergien', placeholder: 'Welche Allergien…', noticeLabel: 'Allergien' },
  { key: 'chronic_illness', label: 'Chronische Krankheiten', placeholder: 'Welche…', noticeLabel: 'Chronische Krankheiten' },
];

const ALL_YESNO_QUESTIONS = [...GENERAL_QUESTIONS, ...FLAGGED_QUESTIONS];

// ---------- Styling exakt nach Design-Spec (2ndSkin Design.dc.html, N1-N8) ----------
const card: React.CSSProperties = { width: '100%', maxWidth: 380, margin: '0 auto', background: '#fff', borderRadius: 20, overflow: 'hidden', fontFamily: "'Work Sans', sans-serif", boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const cardInner: React.CSSProperties = { padding: 24, minHeight: '70vh', display: 'flex', flexDirection: 'column' };
const heading: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, fontWeight: 700, marginBottom: 4 };
const subtext: React.CSSProperties = { fontSize: 12, color: '#999', lineHeight: 1.5, marginBottom: 18 };
const fieldLabel: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', color: '#999', marginBottom: 4, fontWeight: 600, letterSpacing: 0.3 };
const underlineInput: React.CSSProperties = { border: 'none', borderBottom: '1.5px solid #ccc', padding: '8px 2px', fontSize: 14, width: '100%', fontFamily: "'Work Sans', sans-serif", background: 'transparent', color: '#333' };
const primaryBtn: React.CSSProperties = { background: '#111', color: '#fff', textAlign: 'center', padding: 14, fontSize: 14, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%' };
const secondaryBtn: React.CSSProperties = { border: '1px solid #ddd', background: '#fff', textAlign: 'center', padding: 12, fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: 'pointer', flex: 1 };
const noticeBox: React.CSSProperties = { background: 'var(--color-accent-fill)', border: '1px solid var(--color-warn-border)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#5a4a20' };

function normalizePhoneDisplay(v: string) {
  return v.replace(/[^\d+]/g, '');
}

async function resizeImageToBase64(file: File, maxDim = 1280, quality = 0.82): Promise<{ dataBase64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return { dataBase64: dataUrl.split(',')[1], mimeType: 'image/jpeg' };
}

function YesNoPill({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden', fontSize: 10, flexShrink: 0 }}>
      <div onClick={() => onChange(true)} style={{ padding: '4px 10px', cursor: 'pointer', background: value ? '#111' : 'transparent', color: value ? '#fff' : '#777' }}>
        Ja
      </div>
      <div onClick={() => onChange(false)} style={{ padding: '4px 10px', cursor: 'pointer', background: !value ? '#111' : 'transparent', color: !value ? '#fff' : '#777' }}>
        Nein
      </div>
    </div>
  );
}

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const empty = useRef(true);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    empty.current = false;
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(empty.current ? null : canvasRef.current!.toDataURL('image/png'));
  }

  function clear() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    empty.current = true;
    onChange(null);
  }

  return (
    <div>
      <div style={{ border: '1px solid #ddd', borderRadius: 12, minHeight: 220, marginBottom: 16, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={332}
          height={220}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          style={{ touchAction: 'none', width: '100%', height: 220, borderRadius: 12 }}
        />
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 44, borderBottom: '1.5px solid var(--color-accent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: 16, bottom: 20, fontSize: 10, color: '#aaa', pointerEvents: 'none' }}>Unterschrift hier zeichnen</div>
      </div>
      <button type="button" onClick={clear} style={{ ...secondaryBtn, width: '100%' }}>
        Löschen
      </button>
    </div>
  );
}

async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function buildAndUploadPdf(opts: {
  customerId: string;
  vorname: string;
  name: string;
  locationName: string;
  strasse: string;
  plzOrt: string;
  phone: string;
  email: string;
  birthdate: string;
  treatmentType: string;
  answers: { label: string; answer: boolean; detail?: string | null }[];
  sonstiges: string;
  signatureDataUrl: string | null;
  idPhotoDataUrl: string | null;
}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('de-CH');
  let y = 20;

  doc.setFontSize(16);
  doc.text('Registrierungsformular', 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`${opts.vorname} ${opts.name} · ${today} · ${opts.locationName}`, 14, y);
  y += 10;
  doc.setTextColor(0);

  doc.setFontSize(12);
  doc.text('Kontaktdaten', 14, y);
  y += 6;
  doc.setFontSize(10);
  const contactLines = [
    `Adresse: ${opts.strasse}, ${opts.plzOrt}`,
    `Telefon: ${opts.phone}`,
    `E-Mail: ${opts.email || '—'}`,
    `Geburtsdatum: ${opts.birthdate}`,
    `Interesse: ${opts.treatmentType === 'tattoo' ? 'Tattoo' : 'Piercing'}`,
  ];
  for (const line of contactLines) {
    doc.text(line, 14, y);
    y += 6;
  }
  y += 4;

  doc.setFontSize(12);
  doc.text('Gesundheitsfragebogen', 14, y);
  y += 7;
  doc.setFontSize(10);
  for (const a of opts.answers) {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    const line = `${a.label}: ${a.answer ? 'Ja' : 'Nein'}${a.detail ? ` — ${a.detail}` : ''}`;
    const wrapped = doc.splitTextToSize(line, 180);
    doc.text(wrapped, 14, y);
    y += 6 * wrapped.length;
  }
  if (opts.sonstiges.trim()) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const wrapped = doc.splitTextToSize(`Sonstiges: ${opts.sonstiges.trim()}`, 180);
    doc.text(wrapped, 14, y);
    y += 6 * wrapped.length;
  }
  y += 6;

  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(12);
  doc.text('Einverständniserklärung', 14, y);
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(90);
  const consentParas = [
    'Mit meiner Unterschrift bestätige ich, dass ich die gesundheitlichen Fragen wahrheitsgemäss beantwortet habe und über die Risiken der Behandlung (Tattoo/Piercing) informiert wurde.',
    'Ich erkläre mich mit der Durchführung der Behandlung einverstanden und entbinde SkinProject von Ansprüchen, die auf unvollständigen oder unrichtigen Angaben beruhen.',
    'Meine Daten werden gemäss Datenschutzbestimmungen ausschliesslich zur Kundenverwaltung gespeichert.',
  ];
  for (const p of consentParas) {
    const wrapped = doc.splitTextToSize(p, 180);
    doc.text(wrapped, 14, y);
    y += 5 * wrapped.length + 2;
  }
  doc.setTextColor(0);

  if (opts.idPhotoDataUrl) {
    doc.addPage();
    doc.setFontSize(12);
    doc.text('Ausweis', 14, 20);
    try {
      const dims = await getImageDimensions(opts.idPhotoDataUrl);
      const width = 180;
      const height = Math.min(250, width * (dims.height / dims.width));
      doc.addImage(opts.idPhotoDataUrl, 'JPEG', 14, 28, width, height);
    } catch {
      // falls Bildformat/-grösse Probleme macht, PDF trotzdem fertigstellen
    }
  }

  if (opts.signatureDataUrl) {
    if (y > 220) {
      doc.addPage();
      y = 20;
    }
    y += 4;
    doc.setFontSize(10);
    doc.text('Unterschrift:', 14, y);
    y += 4;
    doc.addImage(opts.signatureDataUrl, 'PNG', 14, y, 80, 40);
  }

  const dataUrl = doc.output('datauristring');
  const dataBase64 = dataUrl.split(',')[1];
  const fileName = `Registrierung_${opts.vorname}_${opts.name}_${today.replace(/\./g, '-')}.pdf`;

  await fetch('/api/registration-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId: opts.customerId, type: 'document', fileName, mimeType: 'application/pdf', dataBase64 }),
  });
}

export default function RegisterCustomer() {
  const { locationId } = useParams();
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('');

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [vorname, setVorname] = useState('');
  const [name, setName] = useState('');
  const [strasse, setStrasse] = useState('');
  const [plzOrt, setPlzOrt] = useState('');
  const [email, setEmail] = useState('');
  const [treatmentType, setTreatmentType] = useState<'tattoo' | 'piercing'>('tattoo');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [birthdate, setBirthdate] = useState('');
  const [savingBirthdate, setSavingBirthdate] = useState(false);

  const [uploadingId, setUploadingId] = useState(false);
  const [idPhotoDataUrl, setIdPhotoDataUrl] = useState<string | null>(null);
  const [idPhotoError, setIdPhotoError] = useState<string | null>(null);
  const idFileInputRef = useRef<HTMLInputElement>(null);

  const [answers, setAnswers] = useState<Record<string, boolean>>(() => Object.fromEntries(ALL_YESNO_QUESTIONS.map((q) => [q.key, false])));
  const [details, setDetails] = useState<Record<string, string>>({});
  const [sonstiges, setSonstiges] = useState('');

  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);

  const [consentChecked, setConsentChecked] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  useEffect(() => {
    if (!locationId) return;
    fetch(`/api/location-info?id=${locationId}`)
      .then((r) => r.json())
      .then((body) => {
        if (body.error) {
          setLoadError(body.error);
          return;
        }
        setLocationName(body.location.name);
      })
      .catch(() => setLoadError('Verbindung fehlgeschlagen.'))
      .finally(() => setLoading(false));
  }, [locationId]);

  useEffect(() => {
    if (step !== 'fertig') return;
    const timer = setTimeout(() => {
      setStep('phone');
      setCustomerId(null);
      setPhone('');
      setLookupError(null);
      setVorname('');
      setName('');
      setStrasse('');
      setPlzOrt('');
      setEmail('');
      setTreatmentType('tattoo');
      setProfileError(null);
      setBirthdate('');
      setIdPhotoError(null);
      setIdPhotoDataUrl(null);
      setAnswers(Object.fromEntries(ALL_YESNO_QUESTIONS.map((q) => [q.key, false])));
      setDetails({});
      setSonstiges('');
      setSignatureDataUrl(null);
      setSignatureError(null);
      setConsentChecked(false);
      setFinalizeError(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [step]);

  const age = birthdate ? Math.floor((Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 3600 * 1000)) : null;
  const isMinor = age !== null && age < 18;

  async function handlePhoneSubmit() {
    if (!phone.trim()) return;
    setLookingUp(true);
    setLookupError(null);
    try {
      const res = await fetch('/api/registration-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Unbekannter Fehler.');
      if (body.found) {
        const c = body.customer;
        setCustomerId(c.id);
        setVorname(c.vorname || '');
        setName(c.name || '');
        setStrasse(c.strasse || '');
        setPlzOrt(c.plz_ort || '');
        setEmail(c.email || '');
        setPhone(c.phone || phone);
        if (c.birthdate) setBirthdate(c.birthdate);
      } else {
        setPhone(body.normalizedPhone || phone);
      }
      setStep('kundendaten');
    } catch (e: any) {
      setLookupError(e.message);
    } finally {
      setLookingUp(false);
    }
  }

  async function handleProfileSubmit() {
    if (!vorname.trim() || !name.trim() || !strasse.trim() || !plzOrt.trim() || !phone.trim()) {
      setProfileError('Bitte alle Pflichtfelder ausfüllen.');
      return;
    }
    setSavingProfile(true);
    setProfileError(null);
    try {
      const patch: Record<string, any> = {
        vorname: vorname.trim(),
        name: name.trim(),
        strasse: strasse.trim(),
        plz_ort: plzOrt.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
      };
      const res = await fetch('/api/registration-save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, locationId, patch }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Unbekannter Fehler.');
      setCustomerId(body.customerId);
      setStep('geburtsdatum');
    } catch (e: any) {
      setProfileError(e.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleBirthdateSubmit() {
    if (!birthdate) {
      setProfileError('Bitte Geburtsdatum angeben.');
      return;
    }
    setSavingBirthdate(true);
    setProfileError(null);
    try {
      const res = await fetch('/api/registration-save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, locationId, patch: { birthdate } }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Unbekannter Fehler.');
      setStep('ausweis');
    } catch (e: any) {
      setProfileError(e.message);
    } finally {
      setSavingBirthdate(false);
    }
  }

  async function handleIdPhotoSelected(file: File | undefined) {
    if (!file) return;
    setUploadingId(true);
    setIdPhotoError(null);
    try {
      const { dataBase64, mimeType } = await resizeImageToBase64(file);
      setIdPhotoDataUrl(`data:${mimeType};base64,${dataBase64}`);
      setStep('gesundheit');
    } catch (e: any) {
      setIdPhotoError(e.message);
    } finally {
      setUploadingId(false);
    }
  }

  function handleSignatureConfirm() {
    if (!signatureDataUrl) {
      setSignatureError('Bitte zuerst unterschreiben.');
      return;
    }
    setStep('einverstaendnis');
  }

  async function handleFinalize() {
    if (!consentChecked || !customerId) return;
    setFinalizing(true);
    setFinalizeError(null);
    try {
      const healthNoticeLines = FLAGGED_QUESTIONS.filter((q) => answers[q.key]).map((q) => `${q.noticeLabel}: ${details[q.key]?.trim() || 'Ja'}`);
      const res = await fetch('/api/registration-finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          treatmentType,
          treatmentDetail: null,
          answers: [
            ...ALL_YESNO_QUESTIONS.map((q) => ({ key: q.key, answer: answers[q.key], detail: details[q.key]?.trim() || null })),
            { key: 'sonstiges', answer: !!sonstiges.trim(), detail: sonstiges.trim() || null },
          ],
          healthNoticeText: healthNoticeLines.join('\n') || null,
          consentAccepted: true,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Unbekannter Fehler.');

      // PDF des gesamten Fragebogens erstellen und unter Dokumente ablegen (best effort —
      // schlägt das fehl, blockiert es nicht den Abschluss für die Kundin).
      try {
        await buildAndUploadPdf({
          customerId,
          vorname,
          name,
          locationName,
          strasse,
          plzOrt,
          phone,
          email,
          birthdate,
          treatmentType,
          answers: [
            ...ALL_YESNO_QUESTIONS.map((q) => ({ label: q.label, answer: answers[q.key], detail: details[q.key]?.trim() || null })),
          ],
          sonstiges,
          signatureDataUrl,
          idPhotoDataUrl,
        });
      } catch {
        // still proceed - PDF is a nice-to-have, not a blocker
      }

      setStep('fertig');
    } catch (e: any) {
      setFinalizeError(e.message);
    } finally {
      setFinalizing(false);
    }
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }} />;
  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Work Sans', sans-serif" }}>
        <div style={{ fontSize: 14, color: 'var(--color-destructive)', textAlign: 'center' }}>{loadError}</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '28px 16px 60px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div style={card}>
        {/* N1 WILLKOMMEN */}
        {step === 'phone' && (
          <div style={cardInner}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-primary)', margin: '0 auto 12px' }} />
            <div style={{ textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, fontWeight: 700, letterSpacing: 0.5, marginBottom: 28 }}>SkinProject</div>
            <div style={heading}>Willkommen!</div>
            <div style={subtext}>Schön, dass du da bist. Bevor es losgeht, erstellen wir kurz dein Kundenprofil — das dauert nur 2–3 Minuten.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 'auto' }}>
              {['Deine Kontaktdaten', 'Kurz den Ausweis fotografieren', 'Ein paar Gesundheitsfragen', 'Unterschrift & Einverständnis'].map((t) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#555' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0 }} />
                  {t}
                </div>
              ))}
            </div>
            <div style={{ ...noticeBox, margin: '20px 0 16px' }}>
              Standort: <strong>{locationName}</strong>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={fieldLabel}>Deine Telefonnummer</div>
              <input
                value={phone}
                onChange={(e) => setPhone(normalizePhoneDisplay(e.target.value))}
                style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, fontSize: 13, width: '100%', fontFamily: "'Work Sans', sans-serif" }}
                placeholder="+41 79 123 45 67"
                inputMode="tel"
              />
              <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>Wir prüfen, ob du schon Kundin bei uns bist — dann brauchst du nicht alles neu ausfüllen.</div>
              {lookupError && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 6 }}>{lookupError}</div>}
            </div>
            <button style={{ ...primaryBtn, opacity: phone.trim() && !lookingUp ? 1 : 0.4 }} disabled={!phone.trim() || lookingUp} onClick={handlePhoneSubmit}>
              {lookingUp ? 'Prüft…' : 'Weiter'}
            </button>
          </div>
        )}

        {/* N2 KUNDENDATEN */}
        {step === 'kundendaten' && (
          <div style={cardInner}>
            <div style={heading}>Deine Daten</div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 18 }}>Alle Felder sind Pflicht, ausser E-Mail.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 6 }}>
              <div>
                <div style={fieldLabel}>Vorname</div>
                <input value={vorname} onChange={(e) => setVorname(e.target.value)} style={underlineInput} />
              </div>
              <div>
                <div style={fieldLabel}>Nachname</div>
                <input value={name} onChange={(e) => setName(e.target.value)} style={underlineInput} />
              </div>
            </div>
            <div style={{ margin: '12px 0 6px' }}>
              <div style={fieldLabel}>Strasse, Nr.</div>
              <input value={strasse} onChange={(e) => setStrasse(e.target.value)} style={underlineInput} />
            </div>
            <div style={{ margin: '12px 0 6px' }}>
              <div style={fieldLabel}>PLZ / Ort</div>
              <input value={plzOrt} onChange={(e) => setPlzOrt(e.target.value)} style={underlineInput} />
            </div>
            <div style={{ margin: '12px 0 4px' }}>
              <div style={fieldLabel}>Telefon</div>
              <input value={phone} onChange={(e) => setPhone(normalizePhoneDisplay(e.target.value))} style={underlineInput} inputMode="tel" />
            </div>
            <div style={{ fontSize: 10, color: '#999', marginBottom: 12 }}>Format: +41 79 123 45 67</div>
            <div style={{ margin: '12px 0 6px' }}>
              <div style={fieldLabel}>
                E-Mail <span style={{ textTransform: 'none', color: '#bbb' }}>(optional)</span>
              </div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} style={underlineInput} type="email" />
            </div>
            <div style={{ margin: '16px 0 20px' }}>
              <div style={{ ...fieldLabel, marginBottom: 6 }}>Ich interessiere mich für</div>
              <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', fontSize: 12 }}>
                {(['tattoo', 'piercing'] as const).map((t) => (
                  <div
                    key={t}
                    onClick={() => setTreatmentType(t)}
                    style={{ flex: 1, textAlign: 'center', padding: 9, cursor: 'pointer', background: treatmentType === t ? '#111' : 'transparent', color: treatmentType === t ? '#fff' : '#777' }}
                  >
                    {t === 'tattoo' ? 'Tattoo' : 'Piercing'}
                  </div>
                ))}
              </div>
            </div>
            {profileError && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginBottom: 12 }}>{profileError}</div>}
            <button style={{ ...primaryBtn, opacity: savingProfile ? 0.6 : 1, marginTop: 'auto' }} disabled={savingProfile} onClick={handleProfileSubmit}>
              {savingProfile ? 'Speichert…' : 'Weiter'}
            </button>
          </div>
        )}

        {/* N3 GEBURTSDATUM */}
        {step === 'geburtsdatum' && (
          <div style={cardInner}>
            <div style={heading}>Geburtsdatum</div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 24 }}>Wird für die Alterskontrolle benötigt.</div>
            <input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              style={{ border: '1px solid #ddd', borderRadius: 8, padding: 14, fontSize: 14, marginBottom: 14, width: '100%', fontFamily: "'Work Sans', sans-serif" }}
            />
            {isMinor && <div style={noticeBox}>Bist du unter 18? Beim nächsten Schritt wird zusätzlich der Ausweis eines Elternteils benötigt.</div>}
            <div style={{ flex: 1 }} />
            {profileError && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginBottom: 8 }}>{profileError}</div>}
            <button style={{ ...primaryBtn, marginTop: 20, opacity: savingBirthdate ? 0.6 : 1 }} disabled={savingBirthdate} onClick={handleBirthdateSubmit}>
              {savingBirthdate ? 'Speichert…' : 'Weiter'}
            </button>
          </div>
        )}

        {/* N4 AUSWEIS */}
        {step === 'ausweis' && (
          <div style={cardInner}>
            <div style={heading}>Ausweis fotografieren</div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 16, lineHeight: 1.4 }}>
              Halte deinen Ausweis in den Rahmen. Bei Minderjährigen: Ausweis von Kind und Elternteil zusammen ablichten.
            </div>
            <div
              onClick={() => idFileInputRef.current?.click()}
              style={{ flex: 1, background: '#111', borderRadius: 14, position: 'relative', minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, cursor: 'pointer' }}
            >
              <div style={{ width: '82%', height: '58%', border: '2px solid rgba(176,141,61,0.85)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, textAlign: 'center' }}>
                  Ausweis hier
                  <br />
                  positionieren
                </div>
              </div>
            </div>
            {idPhotoError && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginBottom: 8 }}>{idPhotoError}</div>}
            <input
              ref={idFileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => {
                handleIdPhotoSelected(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button style={{ ...primaryBtn, opacity: uploadingId ? 0.6 : 1 }} disabled={uploadingId} onClick={() => idFileInputRef.current?.click()}>
              {uploadingId ? 'Lädt hoch…' : 'Fotografieren'}
            </button>
          </div>
        )}

        {/* N5 GESUNDHEITSFRAGEBOGEN */}
        {step === 'gesundheit' && (
          <div style={{ ...cardInner, padding: '20px 20px 14px' }}>
            <div style={heading}>Gesundheitsfragebogen</div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 14 }}>Bitte wahrheitsgemäss beantworten.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, overflowY: 'auto', maxHeight: '52vh', marginBottom: 14 }}>
              {GENERAL_QUESTIONS.map((q) => (
                <div key={q.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                  <div style={{ fontSize: 12, flex: 1, paddingRight: 8 }}>{q.label}</div>
                  <YesNoPill value={answers[q.key]} onChange={(v) => setAnswers((prev) => ({ ...prev, [q.key]: v }))} />
                </div>
              ))}
              {FLAGGED_QUESTIONS.map((q) => (
                <div key={q.key} style={{ borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 12, flex: 1, paddingRight: 8 }}>{q.label}</div>
                    <YesNoPill value={answers[q.key]} onChange={(v) => setAnswers((prev) => ({ ...prev, [q.key]: v }))} />
                  </div>
                  {answers[q.key] && (
                    <input
                      value={details[q.key] || ''}
                      onChange={(e) => setDetails((prev) => ({ ...prev, [q.key]: e.target.value }))}
                      placeholder={q.placeholder}
                      style={{ border: '1px solid #ddd', borderRadius: 6, padding: '7px 9px', fontSize: 11, width: '100%', fontFamily: "'Work Sans', sans-serif" }}
                    />
                  )}
                </div>
              ))}
              <div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>Sonstiges</div>
                <textarea
                  value={sonstiges}
                  onChange={(e) => setSonstiges(e.target.value)}
                  placeholder="Weitere Angaben…"
                  style={{ border: '1px solid #ddd', borderRadius: 6, padding: '8px 10px', fontSize: 11, width: '100%', minHeight: 38, fontFamily: "'Work Sans', sans-serif" }}
                />
              </div>
            </div>
            <button style={primaryBtn} onClick={() => setStep('unterschrift')}>
              Weiter
            </button>
          </div>
        )}

        {/* N6 UNTERSCHRIFT */}
        {step === 'unterschrift' && (
          <div style={cardInner}>
            <div style={heading}>Digitale Unterschrift</div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 20, lineHeight: 1.4 }}>
              {isMinor ? 'Bei Minderjährigen: Unterschrift des gesetzlichen Vertreters.' : 'Bitte hier unterschreiben.'}
            </div>
            <SignaturePad onChange={setSignatureDataUrl} />
            {signatureError && <div style={{ fontSize: 11, color: 'var(--color-destructive)', margin: '8px 0' }}>{signatureError}</div>}
            <button style={{ ...primaryBtn, marginTop: 10, opacity: signatureDataUrl ? 1 : 0.4 }} disabled={!signatureDataUrl} onClick={handleSignatureConfirm}>
              Bestätigen
            </button>
          </div>
        )}

        {/* N7 EINVERSTÄNDNIS */}
        {step === 'einverstaendnis' && (
          <div style={cardInner}>
            <div style={{ ...heading, marginBottom: 20 }}>Fast geschafft</div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, border: '1px solid #ddd', borderRadius: 8, padding: 14, marginBottom: 20 }}>
              <div
                onClick={() => setConsentChecked((v) => !v)}
                style={{
                  width: 18,
                  height: 18,
                  border: '1.5px solid #111',
                  background: consentChecked ? '#111' : '#fff',
                  color: '#fff',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {consentChecked ? '✓' : ''}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                Ich akzeptiere die{' '}
                <span onClick={() => setStep('einverstaendnis-detail')} style={{ color: 'var(--color-accent)', cursor: 'pointer', textDecoration: 'underline' }}>
                  Einverständniserklärung
                </span>
                .
              </div>
            </div>
            {finalizeError && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginBottom: 12 }}>{finalizeError}</div>}
            <button style={{ ...primaryBtn, opacity: consentChecked && !finalizing ? 1 : 0.4 }} disabled={!consentChecked || finalizing} onClick={handleFinalize}>
              {finalizing ? 'Schliesst ab…' : 'Abschliessen'}
            </button>
          </div>
        )}

        {/* N7b EINVERSTÄNDNISERKLÄRUNG TEXT */}
        {step === 'einverstaendnis-detail' && (
          <div style={cardInner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div onClick={() => setStep('einverstaendnis')} style={{ fontSize: 16, color: '#777', cursor: 'pointer' }}>
                ←
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700 }}>Einverständniserklärung</div>
            </div>
            <div style={{ flex: 1, fontSize: 11, color: '#666', lineHeight: 1.7, overflowY: 'auto' }}>
              <p style={{ margin: '0 0 10px' }}>
                Mit meiner Unterschrift bestätige ich, dass ich die gesundheitlichen Fragen wahrheitsgemäss beantwortet habe und über die Risiken der Behandlung (Tattoo/Piercing) informiert wurde.
              </p>
              <p style={{ margin: '0 0 10px' }}>
                Ich erkläre mich mit der Durchführung der Behandlung einverstanden und entbinde 2ndSkin von Ansprüchen, die auf unvollständigen oder unrichtigen Angaben beruhen.
              </p>
              <p style={{ margin: 0 }}>Meine Daten werden gemäss Datenschutzbestimmungen ausschliesslich zur Kundenverwaltung gespeichert.</p>
            </div>
            <button style={{ ...secondaryBtn, width: '100%', marginTop: 16 }} onClick={() => setStep('einverstaendnis')}>
              Zurück
            </button>
          </div>
        )}

        {/* N8 FERTIG */}
        {step === 'fertig' && (
          <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 20 }}>✓</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Danke, {vorname}!</div>
            <div style={{ fontSize: 12, color: '#777', lineHeight: 1.5 }}>Dein Kundenprofil wurde erstellt. Bitte nimm im Wartebereich Platz — dein Artist holt dich ab.</div>
          </div>
        )}
      </div>
    </div>
  );
}
