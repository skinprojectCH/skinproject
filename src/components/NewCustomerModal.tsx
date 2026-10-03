import { useState } from 'react';
import { createCustomer, findPossibleDuplicates, type Customer } from '../lib/queries';
import DuplicateWarning from './DuplicateWarning';
import { normalizePhone } from '../lib/format';
import Modal from './Modal';

const inputStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' };

export default function NewCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [vorname, setVorname] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [strasse, setStrasse] = useState('');
  const [plzOrt, setPlzOrt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [duplicates, setDuplicates] = useState<Customer[] | null>(null);

  const vornameValid = vorname.trim().length > 0;
  const nameValid = name.trim().length > 0;
  const phoneValid = phone.trim().length > 0;
  // E-Mail ist freiwillig (bewusst ohne Formatprüfung, damit importierte Altdaten speicherbar bleiben).
  const emailValid = true;
  const strasseValid = true;
  const plzOrtValid = true;
  // Schnellerfassung (z.B. am Telefon): nur Name, Vorname und Mobile sind Pflicht.
  const birthdateValid = true;
  const allValid = vornameValid && nameValid && phoneValid && emailValid && strasseValid && plzOrtValid && birthdateValid;

  async function handleCreate(skipDuplicateCheck = false) {
    setAttempted(true);
    if (!allValid) return;
    setSaving(true);
    setError(null);
    try {
      if (!skipDuplicateCheck) {
        const found = await findPossibleDuplicates({ phone, vorname, name, birthdate: birthdate || null });
        if (found.length > 0) {
          setDuplicates(found);
          setSaving(false);
          return;
        }
      }
      const created = await createCustomer({
        vorname: vorname.trim(),
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() ? normalizePhone(phone) : null,
        birthdate: birthdate || null,
        strasse: strasse.trim() || null,
        plz_ort: plzOrt.trim() || null,
      });
      onCreated(created.id);
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <Modal title="Neuer Kunde" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Vorname
          </div>
          <input
            value={vorname}
            onChange={(e) => setVorname(e.target.value)}
            style={attempted && !vornameValid ? { ...inputStyle, border: '1px solid var(--color-destructive)' } : inputStyle}
            autoFocus
          />
          {attempted && !vornameValid && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 4 }}>Pflichtfeld.</div>}
        </div>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Name
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} style={attempted && !nameValid ? { ...inputStyle, border: '1px solid var(--color-destructive)' } : inputStyle} />
          {attempted && !nameValid && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 4 }}>Pflichtfeld.</div>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Mobile
          </div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => phone.trim() && setPhone(normalizePhone(phone))}
            style={attempted && !phoneValid ? { ...inputStyle, border: '1px solid var(--color-destructive)' } : inputStyle}
            placeholder="+41791234567"
          />
        </div>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            E-Mail
          </div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={attempted && !emailValid ? { ...inputStyle, border: '1px solid var(--color-destructive)' } : inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Strasse
        </div>
        <input value={strasse} onChange={(e) => setStrasse(e.target.value)} style={attempted && !strasseValid ? { ...inputStyle, border: '1px solid var(--color-destructive)' } : inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            PLZ / Ort
          </div>
          <input value={plzOrt} onChange={(e) => setPlzOrt(e.target.value)} style={attempted && !plzOrtValid ? { ...inputStyle, border: '1px solid var(--color-destructive)' } : inputStyle} />
        </div>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Geburtsdatum
          </div>
          <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} style={attempted && !birthdateValid ? { ...inputStyle, border: '1px solid var(--color-destructive)' } : inputStyle} />
        </div>
      </div>
      {attempted && !allValid && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginBottom: 8 }}>Pflichtfelder: Name, Vorname und Mobile.</div>}
      {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{error}</div>}
      {duplicates && duplicates.length > 0 && (
        <DuplicateWarning
          matches={duplicates}
          useLabel="Diesen auswählen"
          onUse={(c) => onCreated(c.id)}
          onCreateAnyway={() => handleCreate(true)}
          onCancel={() => setDuplicates(null)}
          creating={saving}
          vorname={vorname}
          name={name}
        />
      )}
      <div style={{ display: 'flex', gap: 10, ...(duplicates && duplicates.length > 0 ? { display: 'none' } : {}) }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={() => handleCreate()}>
          {saving ? 'Speichert…' : 'Erstellen'}
        </button>
      </div>
    </Modal>
  );
}
