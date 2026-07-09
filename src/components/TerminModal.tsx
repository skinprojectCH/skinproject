import { useState } from 'react';
import Modal from './Modal';

const MOCK_SERVICES = [
  { id: 's1', name: 'Sleeve Session', durationMin: 180, price: 380 },
  { id: 's2', name: 'Cover-Up klein', durationMin: 90, price: 220 },
  { id: 's3', name: 'Piercing Ohr', durationMin: 20, price: 60 },
  { id: 's4', name: 'Beratung', durationMin: 30, price: 0 },
];

const MOCK_ARTISTS = ['Nina', 'Tom'];

const ABSENCE_TYPES: { key: 'ferien' | 'krank' | 'abwesend'; label: string }[] = [
  { key: 'ferien', label: 'Ferien' },
  { key: 'krank', label: 'Krank' },
  { key: 'abwesend', label: 'Abwesend' },
];

function fieldLabel(text: string) {
  return (
    <div className="label-uppercase" style={{ marginBottom: 4 }}>
      {text}
    </div>
  );
}

const boxStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 4,
  padding: '9px 10px',
  fontSize: 13,
};

export default function TerminModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [tab, setTab] = useState<'termin' | 'absenz'>('termin');

  // Termin-State
  const [selectedServices, setSelectedServices] = useState<string[]>(['s1', 's3']);
  const totalDuration = selectedServices.reduce((sum, id) => sum + (MOCK_SERVICES.find((s) => s.id === id)?.durationMin || 0), 0);
  const totalPrice = selectedServices.reduce((sum, id) => sum + (MOCK_SERVICES.find((s) => s.id === id)?.price || 0), 0);

  // Absenz-State
  const [absenceType, setAbsenceType] = useState<'ferien' | 'krank' | 'abwesend'>('ferien');
  const [halfDay, setHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<'vormittag' | 'nachmittag'>('vormittag');

  return (
    <Modal title={tab === 'termin' ? 'Neuer Termin' : 'Neue Absenz'} onClose={onClose}>
      <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', fontSize: 12, marginBottom: 16 }}>
        <button
          onClick={() => setTab('termin')}
          style={{ flex: 1, textAlign: 'center', padding: 8, background: tab === 'termin' ? '#111' : 'transparent', color: tab === 'termin' ? '#fff' : '#777', border: 'none', fontWeight: tab === 'termin' ? 600 : 400 }}
        >
          Termin
        </button>
        <button
          onClick={() => setTab('absenz')}
          style={{ flex: 1, textAlign: 'center', padding: 8, background: tab === 'absenz' ? '#111' : 'transparent', color: tab === 'absenz' ? '#fff' : '#777', border: 'none', fontWeight: tab === 'absenz' ? 600 : 400 }}
        >
          Absenz
        </button>
      </div>

      {tab === 'termin' ? (
        <>
          <div style={{ marginBottom: 14 }}>
            {fieldLabel('Kunde auswählen')}
            <div style={{ ...boxStyle, color: '#999' }}>🔍 Suchen…</div>
            <div style={{ fontSize: 11, color: 'var(--color-accent)', marginTop: 4 }}>Oder neu erfassen</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            {fieldLabel('Artist auswählen')}
            <select style={{ ...boxStyle, width: '100%' }} defaultValue={MOCK_ARTISTS[0]}>
              {MOCK_ARTISTS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              {fieldLabel('Datum auswählen')}
              <input type="date" style={{ ...boxStyle, width: '100%' }} />
            </div>
            <div>
              {fieldLabel('Startzeit')}
              <input type="time" style={{ ...boxStyle, width: '100%' }} defaultValue="14:00" />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            {fieldLabel('Services')}
            {selectedServices.map((id) => {
              return (
                <div key={id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <select
                    value={id}
                    onChange={(e) =>
                      setSelectedServices((prev) => prev.map((sid) => (sid === id ? e.target.value : sid)))
                    }
                    style={{ ...boxStyle, flex: 1 }}
                  >
                    {MOCK_SERVICES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setSelectedServices((prev) => prev.filter((sid) => sid !== id))}
                    style={{ background: 'none', border: 'none', fontSize: 14, color: '#999' }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            <div
              onClick={() => setSelectedServices((prev) => [...prev, MOCK_SERVICES[0].id])}
              style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}
            >
              + Weiteren Service hinzufügen
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#777', marginBottom: 22, borderTop: '1px solid #eee', paddingTop: 10 }}>
            <div>Gesamtdauer: {totalDuration} min</div>
            <div style={{ fontWeight: 600, color: '#111' }}>Total: CHF {totalPrice}</div>
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            {fieldLabel('Artist')}
            <select style={{ ...boxStyle, width: '100%' }} defaultValue={MOCK_ARTISTS[0]}>
              {MOCK_ARTISTS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            {fieldLabel('Art der Absenz')}
            <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', fontSize: 12 }}>
              {ABSENCE_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setAbsenceType(t.key)}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: 8,
                    background: absenceType === t.key ? '#111' : 'transparent',
                    color: absenceType === t.key ? '#fff' : '#777',
                    border: 'none',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              {fieldLabel('Datum von')}
              <input type="date" style={{ ...boxStyle, width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              {fieldLabel('Datum bis')}
              <input type="date" style={{ ...boxStyle, width: '100%' }} />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            {fieldLabel('Dauer')}
            <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', fontSize: 12, marginBottom: 8 }}>
              <button
                onClick={() => setHalfDay(false)}
                style={{ flex: 1, textAlign: 'center', padding: 8, background: !halfDay ? '#111' : 'transparent', color: !halfDay ? '#fff' : '#777', border: 'none' }}
              >
                Ganzer Tag
              </button>
              <button
                onClick={() => setHalfDay(true)}
                style={{ flex: 1, textAlign: 'center', padding: 8, background: halfDay ? '#111' : 'transparent', color: halfDay ? '#fff' : '#777', border: 'none' }}
              >
                Halber Tag
              </button>
            </div>
            {halfDay && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ fontSize: 12, fontWeight: halfDayPeriod === 'vormittag' ? 600 : 400 }}>Vormittag</div>
                <div
                  onClick={() => setHalfDayPeriod((p) => (p === 'vormittag' ? 'nachmittag' : 'vormittag'))}
                  style={{
                    width: 42,
                    height: 24,
                    background: 'var(--color-accent)',
                    borderRadius: 12,
                    position: 'relative',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      background: '#fff',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: 3,
                      left: halfDayPeriod === 'vormittag' ? 3 : 21,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                      transition: 'left 0.15s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: halfDayPeriod === 'nachmittag' ? '#111' : '#999', fontWeight: halfDayPeriod === 'nachmittag' ? 600 : 400 }}>
                  Nachmittag
                </div>
              </div>
            )}
          </div>
          <div style={{ marginBottom: 22 }}>
            {fieldLabel('Notiz (optional)')}
            <textarea placeholder="z.B. Grund der Absenz…" style={{ ...boxStyle, width: '100%', minHeight: 44, fontFamily: 'var(--font-body)' }} />
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onSave}>
          {tab === 'termin' ? 'Speichern' : 'Absenz speichern'}
        </button>
      </div>
    </Modal>
  );
}
