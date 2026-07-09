import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { deleteAppointment } from '../lib/queries';

interface Props {
  appointmentId: string;
  onClose: () => void;
  customer: string;
  artist: string;
  date: string;
  time: string;
  serviceName: string;
  durationMin: number;
  price: number;
}

const boxStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13 };
const highlightBoxStyle: React.CSSProperties = { ...boxStyle, border: '1.5px solid var(--color-accent)' };

export default function EditTerminModal({ appointmentId, onClose, customer, artist, date, time, serviceName, durationMin, price }: Props) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteAppointment(appointmentId);
      onClose();
    } catch (e: any) {
      setError(e.message);
      setDeleting(false);
    }
  }

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
          Artist
        </div>
        <div style={boxStyle}>{artist}</div>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#777', marginBottom: 22, borderTop: '1px solid #eee', paddingTop: 10 }}>
        <div>{serviceName}</div>
        <div style={{ fontWeight: 600, color: '#111' }}>
          {durationMin} min · CHF {price}
        </div>
      </div>

      {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{error}</div>}

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
          <button
            className="btn btn-destructive"
            style={{ flex: 1, justifyContent: 'center', background: 'var(--color-destructive)', color: '#fff', opacity: deleting ? 0.6 : 1 }}
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? 'Löscht…' : 'Wirklich löschen'}
          </button>
        </div>
      )}
    </Modal>
  );
}
