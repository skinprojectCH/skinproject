import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

// Generelle Gesundheitsfragen (nicht im Kundenprofil-Callout angezeigt).
const GENERAL_QUESTIONS = [
  { key: 'chronic_illness', label: 'Hast du eine chronische Erkrankung (z.B. Diabetes, Epilepsie, Herzerkrankung)?' },
  { key: 'blood_thinners', label: 'Nimmst du blutverdünnende Medikamente ein?' },
  { key: 'infectious_disease', label: 'Hast du eine ansteckende Krankheit (z.B. Hepatitis, HIV)?' },
  { key: 'keloids', label: 'Neigst du bei der Wundheilung zu Wucherungen (Keloide)?' },
];

// Die letzten 4 Fragen: bei "Ja" wird das im Kundenprofil oben rechts als Hinweis angezeigt.
const FLAGGED_QUESTIONS = [
  { key: 'allergies', label: 'Hast du bekannte Allergien (z.B. Latex, Pflaster, Farbstoffe)?', noticeLabel: 'Allergien' },
  { key: 'skin_conditions', label: 'Hast du Hautkrankheiten oder Narbenbildung im zu behandelnden Bereich?', noticeLabel: 'Hautkrankheiten/Narben' },
  { key: 'pregnancy', label: 'Bist du schwanger oder stillst du?', noticeLabel: 'Schwangerschaft/Stillzeit' },
  { key: 'medication', label: 'Nimmst du aktuell Medikamente ein, die die Wundheilung beeinflussen könnten?', noticeLabel: 'Medikamente' },
];

const ALL_QUESTIONS = [...GENERAL_QUESTIONS, ...FLAGGED_QUESTIONS];

const boxStyle: React.CSSProperties = { border: '1px solid var(--color-border)', borderRadius: 8, padding: 18, marginBottom: 16, background: '#fff' };
const inputStyle: React.CSSProperties = { border: '1px solid var(--color-border)', borderRadius: 4, padding: '9px 10px', fontSize: 14, width: '100%', fontFamily: 'var(--font-body)' };
const labelStyle: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', marginBottom: 4, fontWeight: 600 };

function YesNoToggle({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[
        { v: false, label: 'Nein' },
        { v: true, label: 'Ja' },
      ].map((opt) => (
        <button
          key={String(opt.v)}
          type="button"
          onClick={() => onChange(opt.v)}
          style={{
            flex: 1,
            padding: '9px 0',
            borderRadius: 6,
            border: `1px solid ${value === opt.v ? 'var(--color-accent)' : 'var(--color-border)'}`,
            background: value === opt.v ? 'var(--color-accent-fill)' : '#fff',
            color: value === opt.v ? 'var(--color-accent)' : '#555',
            fontWeight: value === opt.v ? 700 : 400,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function RegisterCustomer() {
  const { locationId } = useParams();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('');

  const [vorname, setVorname] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [strasse, setStrasse] = useState('');
  const [plzOrt, setPlzOrt] = useState('');

  const [treatmentType, setTreatmentType] = useState<'tattoo' | 'piercing' | ''>('');
  const [treatmentDetail, setTreatmentDetail] = useState('');

  const [answers, setAnswers] = useState<Record<string, boolean | null>>(() => Object.fromEntries(ALL_QUESTIONS.map((q) => [q.key, null])));
  const [details, setDetails] = useState<Record<string, string>>({});

  const [consentAccepted, setConsentAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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

  const profileValid = vorname.trim().length > 0 && name.trim().length > 0;
  const allAnswered = ALL_QUESTIONS.every((q) => answers[q.key] !== null);
  const canSubmit = profileValid && allAnswered && treatmentType && consentAccepted && !submitting;

  async function handleSubmit() {
    if (!canSubmit || !locationId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const healthNoticeLines = FLAGGED_QUESTIONS.filter((q) => answers[q.key] === true).map((q) => `${q.noticeLabel}: ${details[q.key]?.trim() || 'Ja'}`);
      const res = await fetch('/api/submit-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          profile: {
            vorname: vorname.trim(),
            name: name.trim(),
            email: email.trim() || null,
            phone: phone.trim() || null,
            birthdate: birthdate || null,
            strasse: strasse.trim() || null,
            plzOrt: plzOrt.trim() || null,
          },
          treatmentType,
          treatmentDetail: treatmentDetail.trim() || null,
          answers: ALL_QUESTIONS.map((q) => ({ key: q.key, answer: answers[q.key], detail: details[q.key]?.trim() || null })),
          healthNoticeText: healthNoticeLines.join('\n') || null,
          consentAccepted,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Unbekannter Fehler.');
      setSubmitted(true);
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }} />;
  }

  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-body)' }}>
        <div style={{ fontSize: 14, color: 'var(--color-destructive)', textAlign: 'center' }}>{loadError}</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-body)' }}>
        <div style={{ maxWidth: 380, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: 10 }}>Danke, {vorname}!</div>
          <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>Deine Registrierung ist eingegangen. Bis bald im Studio.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: 'var(--font-body)', padding: '28px 16px 60px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 12, letterSpacing: 1, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: 6 }}>{locationName || 'SkinProject'}</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Willkommen!</div>
          <div style={{ fontSize: 13, color: '#777', marginTop: 4 }}>Bitte füll das kurz vor deinem Termin aus.</div>
        </div>

        <div style={boxStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Deine Angaben</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={labelStyle}>Vorname</div>
              <input value={vorname} onChange={(e) => setVorname(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>Name</div>
              <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={labelStyle}>E-Mail</div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} type="email" />
            </div>
            <div>
              <div style={labelStyle}>Mobile</div>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} placeholder="+41791234567" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Strasse</div>
            <input value={strasse} onChange={(e) => setStrasse(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={labelStyle}>Geburtsdatum</div>
              <input value={birthdate} onChange={(e) => setBirthdate(e.target.value)} style={inputStyle} type="date" />
            </div>
            <div>
              <div style={labelStyle}>PLZ / Ort</div>
              <input value={plzOrt} onChange={(e) => setPlzOrt(e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={boxStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Behandlung</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {(['tattoo', 'piercing'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTreatmentType(t)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 6,
                  border: `1px solid ${treatmentType === t ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: treatmentType === t ? 'var(--color-accent-fill)' : '#fff',
                  color: treatmentType === t ? 'var(--color-accent)' : '#555',
                  fontWeight: treatmentType === t ? 700 : 400,
                  fontSize: 13,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {t === 'tattoo' ? 'Tattoo' : 'Piercing'}
              </button>
            ))}
          </div>
          <div style={labelStyle}>Bereich / Motiv (kurz)</div>
          <input value={treatmentDetail} onChange={(e) => setTreatmentDetail(e.target.value)} style={inputStyle} placeholder="z.B. Unterarm, kleines Motiv" />
        </div>

        <div style={boxStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Gesundheitsfragen</div>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 14 }}>Wichtig für deine Sicherheit — wird vertraulich behandelt.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {ALL_QUESTIONS.map((q) => (
              <div key={q.key}>
                <div style={{ fontSize: 13, marginBottom: 8 }}>{q.label}</div>
                <YesNoToggle value={answers[q.key]} onChange={(v) => setAnswers((prev) => ({ ...prev, [q.key]: v }))} />
                {answers[q.key] === true && (
                  <input
                    value={details[q.key] || ''}
                    onChange={(e) => setDetails((prev) => ({ ...prev, [q.key]: e.target.value }))}
                    style={{ ...inputStyle, marginTop: 8 }}
                    placeholder="Kurze Angabe dazu…"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={boxStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Einverständniserklärung</div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6, marginBottom: 12 }}>
            Ich bestätige, dass ich die obigen Angaben wahrheitsgetreu gemacht habe, über die Risiken der Behandlung aufgeklärt wurde und stimme der Durchführung zu.
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={consentAccepted} onChange={(e) => setConsentAccepted(e.target.checked)} style={{ marginTop: 2 }} />
            <span style={{ fontSize: 13 }}>Ich stimme zu.</span>
          </label>
        </div>

        {submitError && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{submitError}</div>}

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', opacity: canSubmit ? 1 : 0.4 }} disabled={!canSubmit} onClick={handleSubmit}>
          {submitting ? 'Sendet…' : 'Registrierung abschicken'}
        </button>
        {!allAnswered && <div style={{ fontSize: 11, color: '#999', marginTop: 8, textAlign: 'center' }}>Bitte alle Fragen beantworten.</div>}
      </div>
    </div>
  );
}
