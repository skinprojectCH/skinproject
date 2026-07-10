import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { deleteAppointment, fetchAppointmentLineItems } from '../lib/queries';

interface Props {
  appointmentId: string;
  onClose: () => void;
  customer: string;
  customerPhone?: string | null;
  artist: string;
  date: string;
  time: string;
  endTime: string;
}

const boxStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13 };
const highlightBoxStyle: React.CSSProperties = { ...boxStyle, border: '1.5px solid var(--color-accent)' };

export default function EditTerminModal({ appointmentId, onClose, customer, customerPhone, artist, date, time, endTime }: Props) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    fetchAppointmentLineItems(appointmentId)
      .then(setLineItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingItems(false));
  }, [appointmentId]);

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

  const totalDuration = lineItems.reduce((sum, li) => sum + (li.services?.duration_minutes || 0), 0);
  const totalPrice = lineItems.reduce((sum, li) => sum + li.unit_price * li.quantity, 0);

  return (
    <Modal title="Termin bearbeiten" onClose={onClose}>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 14 }}>
        Doppelklick auf einen Termin öffnet diesen Dialog — Datum/Zeit können verschoben werden.
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Kunde
        </div>
        <div style={boxStyle}>
          {customer}
          {customerPhone ? ` · ${customerPhone}` : ''}
        </div>
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
          <div style={highlightBoxStyle}>
            {time} – {endTime}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Dienstleistungen
        </div>
        {loadingItems ? (
          <div style={{ fontSize: 12, color: '#999' }}>Lädt…</div>
        ) : lineItems.length === 0 ? (
          <div style={{ fontSize: 12, color: '#999' }}>Keine Dienstleistungen erfasst.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {lineItems.map((li) => (
              <div key={li.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <div>{li.services?.name || 'Unbekannter Service'}</div>
                <div style={{ color: '#777' }}>CHF {li.unit_price}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#777', marginBottom: 22, borderTop: '1px solid #eee', paddingTop: 10 }}>
        <div>Dauer: {totalDuration} min</div>
        <div style={{ fontWeight: 600, color: '#111' }}>Total: CHF {totalPrice}</div>
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
