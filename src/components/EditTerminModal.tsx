import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';

const MOCK_ARTISTS = ['Nina', 'Tom'];

interface Props {
  onClose: () => void;
  customer: string;
  artist: string;
  date: string;
  time: string;
  serviceName: string;
  durationMin: number;
  price: number;
}

const boxStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 4,
  padding: '9px 10px',
  fontSize: 13,
};

const highlightBoxStyle: React.CSSProperties = {
  ...boxStyle,
  border: '1.5px solid var(--color-accent)',
};

export default function EditTerminModal({ onClose, customer, artist, date, time, serviceName, durationMin, price }: Props) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Modal title="Termin bearbeiten" onClose={onClose}>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 14 }}>
        Doppelklick auf einen Termin öffnet diesen Dialog — Datum/Zeit können verschoben werden.
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Kunde
        </div>
        <div style={boxStyle}>{customer}</div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Artist auswählen
        </div>
        <select style={{ ...boxStyle, width: '100%' }} defaultValue={artist}>
          {MOCK_ARTISTS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Datum verschieben
          </div>
          <div style={highlightBoxStyle}>{date}</div>
        </div>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Zeit verschieben
          </div>
          <div style={highlightBoxStyle}>{time}</div>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Services
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <div style={{ ...boxStyle, flex: 1 }}>{serviceName} ▾</div>
          <button style={{ background: 'none', border: 'none', fontSize: 14, color: '#999' }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600 }}>+ Weiteren Service hinzufügen</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#777', marginBottom: 22, borderTop: '1px solid #eee', paddingTop: 10 }}>
        <div>Dauer: {durationMin} min</div>
        <div style={{ fontWeight: 600, color: '#111' }}>Total: CHF {price}</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Speichern
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate('/kasse')}>
          Kassieren
        </button>
      </div>

      {!confirmDelete ? (
        <button className="btn btn-destructive" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setConfirmDelete(true)}>
          Termin löschen
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmDelete(false)}>
            Abbrechen
          </button>
          <button className="btn btn-destructive" style={{ flex: 1, justifyContent: 'center', background: 'var(--color-destructive)', color: '#fff' }} onClick={onClose}>
            Wirklich löschen
          </button>
        </div>
      )}
    </Modal>
  );
}
