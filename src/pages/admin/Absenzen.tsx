import { useState } from 'react';
import Modal from '../../components/Modal';

type AbsenceType = 'ferien' | 'krank' | 'abwesend';

interface Absence {
  id: string;
  artist: string;
  von: string;
  bis: string;
  dauer: string;
  type: AbsenceType;
}

const MOCK_ABSENCES: Absence[] = [
  { id: 'ab1', artist: 'Nina', von: '21.07.2026', bis: '04.08.2026', dauer: 'Ganzer Tag', type: 'ferien' },
  { id: 'ab2', artist: 'Tom', von: '15.08.2026', bis: '15.08.2026', dauer: 'Halber Tag', type: 'ferien' },
];

const TABS: { key: AbsenceType; label: string }[] = [
  { key: 'ferien', label: 'Ferien' },
  { key: 'krank', label: 'Krank' },
  { key: 'abwesend', label: 'Abwesend' },
];

function NewAbsenceModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<AbsenceType>('ferien');
  const [halfDay, setHalfDay] = useState(false);

  return (
    <Modal title="Neue Absenz" onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Artist
        </div>
        <select style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%' }}>
          <option>Nina Berger</option>
          <option>Tom Rossi</option>
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div className="label-uppercase" style={{ marginBottom: 6 }}>
          Art der Absenz
        </div>
        <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', fontSize: 12 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              style={{ flex: 1, textAlign: 'center', padding: 8, background: type === t.key ? '#111' : 'transparent', color: type === t.key ? '#fff' : '#777', border: 'none' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Datum von
          </div>
          <input type="date" style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Datum bis
          </div>
          <input type="date" style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%' }} />
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="label-uppercase" style={{ marginBottom: 6 }}>
          Dauer
        </div>
        <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', fontSize: 12, marginBottom: 8 }}>
          <button onClick={() => setHalfDay(false)} style={{ flex: 1, padding: 8, background: !halfDay ? '#111' : 'transparent', color: !halfDay ? '#fff' : '#777', border: 'none' }}>
            Ganzer Tag
          </button>
          <button onClick={() => setHalfDay(true)} style={{ flex: 1, padding: 8, background: halfDay ? '#111' : 'transparent', color: halfDay ? '#fff' : '#777', border: 'none' }}>
            Halber Tag
          </button>
        </div>
        {halfDay && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Vormittag</div>
            <div style={{ width: 42, height: 24, background: 'var(--color-accent)', borderRadius: 12, position: 'relative' }}>
              <div style={{ width: 18, height: 18, background: '#fff', borderRadius: '50%', position: 'absolute', top: 3, left: 3, boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }} />
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>Nachmittag</div>
          </div>
        )}
      </div>
      <div style={{ marginBottom: 22 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Notiz (optional)
        </div>
        <textarea placeholder="z.B. Grund der Absenz…" style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 12, width: '100%', minHeight: 44, fontFamily: 'var(--font-body)' }} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Absenz speichern
        </button>
      </div>
    </Modal>
  );
}

export default function Absenzen() {
  const [tab, setTab] = useState<AbsenceType>('ferien');
  const [showNew, setShowNew] = useState(false);

  const filtered = MOCK_ABSENCES.filter((a) => a.type === tab);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ fontSize: 24 }}>Absenzen</h1>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Neue Absenz
        </button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 20, fontSize: 13 }}>
        {TABS.map((t) => (
          <div
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 18px',
              borderBottom: tab === t.key ? '2px solid var(--color-accent)' : '2px solid transparent',
              fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? '#111' : '#777',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 50px', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
        <div>Artist</div>
        <div>Von</div>
        <div>Bis</div>
        <div>Dauer</div>
        <div />
      </div>

      {filtered.map((a) => (
        <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 50px', padding: '14px 12px', fontSize: 13, borderBottom: '1px solid #eee' }}>
          <div>{a.artist}</div>
          <div>{a.von}</div>
          <div>{a.bis}</div>
          <div>{a.dauer}</div>
          <div />
        </div>
      ))}
      {filtered.length === 0 && <div style={{ padding: '20px 12px', fontSize: 13, color: '#999' }}>Keine Einträge in dieser Kategorie.</div>}

      {showNew && <NewAbsenceModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
