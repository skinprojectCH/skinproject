import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import {
  fetchAppointment,
  updateAppointment,
  deleteAppointment,
  fetchAppointmentLineItems,
  replaceAppointmentLineItems,
  fetchArtists,
  fetchCustomers,
  fetchServices,
  fetchServiceCategories,
  type Artist,
  type Customer,
  type Service,
  type ServiceCategory,
} from '../lib/queries';

interface Props {
  appointmentId: string;
  onClose: () => void;
}

const boxStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' };

function fieldLabel(text: string) {
  return (
    <div className="label-uppercase" style={{ marginBottom: 4 }}>
      {text}
    </div>
  );
}

function toDateInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditTerminModal({ appointmentId, onClose }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [artists, setArtists] = useState<Artist[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([fetchAppointment(appointmentId), fetchAppointmentLineItems(appointmentId), fetchArtists(), fetchCustomers(), fetchServices(), fetchServiceCategories()])
      .then(([appt, lineItems, allArtists, allCustomers, allServices, allCategories]) => {
        setSelectedCustomer(appt.customer_id || '');
        setSelectedArtist(appt.artist_id || '');
        setDate(toDateInput(appt.start_time));
        setTime(toTimeInput(appt.start_time));
        setArtists(allArtists.filter((a) => a.status === 'active' && (!appt.location_id || a.location_id === appt.location_id)));
        setCustomers(allCustomers);
        setServices(allServices.filter((s) => s.active));
        setCategories(allCategories);
        setSelectedServices(lineItems.length ? lineItems.map((li: any) => li.service_id) : ['']);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [appointmentId]);

  const totalDuration = selectedServices.reduce((sum, id) => sum + (services.find((s) => s.id === id)?.duration_minutes || 0), 0);
  const totalPrice = selectedServices.reduce((sum, id) => sum + (services.find((s) => s.id === id)?.price || 0), 0);

  async function handleSave() {
    if (!selectedArtist || !date || !time) {
      setSaveError('Bitte Artist, Datum und Zeit auswählen.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      // Gleiche Zeitzonen-sichere Umrechnung wie beim Neu-Erstellen: über new Date()
      // laufen lassen und dann explizit auf UTC (.toISOString()) umrechnen.
      const startDate = new Date(`${date}T${time}:00`);
      const startISO = startDate.toISOString();
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + (totalDuration || 30));

      await updateAppointment(appointmentId, {
        customer_id: selectedCustomer || null,
        artist_id: selectedArtist,
        start_time: startISO,
        end_time: endDate.toISOString(),
      });

      const lineItems = selectedServices
        .map((id) => services.find((s) => s.id === id))
        .filter((s): s is Service => !!s)
        .map((s) => ({ service_id: s.id, quantity: 1, unit_price: s.price }));
      await replaceAppointmentLineItems(appointmentId, lineItems);

      onClose();
    } catch (e: any) {
      setSaveError(e.message);
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setSaveError(null);
    try {
      await deleteAppointment(appointmentId);
      onClose();
    } catch (e: any) {
      setSaveError(e.message);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <Modal title="Termin bearbeiten" onClose={onClose}>
        <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal title="Termin bearbeiten" onClose={onClose}>
        <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>
      </Modal>
    );
  }

  return (
    <Modal title="Termin bearbeiten" onClose={onClose}>
      <div style={{ marginBottom: 14 }}>
        {fieldLabel('Kunde')}
        <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} style={boxStyle}>
          <option value="">Laufkunde (kein Kunde)</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.vorname} {c.name}
              {c.phone ? ` · ${c.phone}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        {fieldLabel('Artist')}
        <select value={selectedArtist} onChange={(e) => setSelectedArtist(e.target.value)} style={boxStyle}>
          {artists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          {fieldLabel('Datum')}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={boxStyle} />
        </div>
        <div>
          {fieldLabel('Startzeit')}
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={boxStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        {fieldLabel('Services')}
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ ...boxStyle, marginBottom: 8, color: categoryFilter ? '#111' : '#777' }}>
          <option value="">Alle Kategorien</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {selectedServices.map((id, index) => {
          const filteredServices = categoryFilter ? services.filter((s) => s.category_id === categoryFilter) : services;
          const selectedStillVisible = id && filteredServices.some((s) => s.id === id);
          const optionsForRow = selectedStillVisible || !id ? filteredServices : [...filteredServices, services.find((s) => s.id === id)!].filter(Boolean);
          return (
            <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <select
                value={id}
                onChange={(e) => setSelectedServices((prev) => prev.map((sid, i) => (i === index ? e.target.value : sid)))}
                style={{ ...boxStyle, flex: 1, color: id ? '#111' : '#777' }}
              >
                <option value="">Service wählen…</option>
                {optionsForRow.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button onClick={() => setSelectedServices((prev) => prev.filter((_, i) => i !== index))} style={{ background: 'none', border: 'none', fontSize: 14, color: '#999' }}>
                ✕
              </button>
            </div>
          );
        })}
        <div
          onClick={() => {
            setSelectedServices((prev) => ['', ...prev]);
            setCategoryFilter('');
          }}
          style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}
        >
          + Weiteren Service hinzufügen
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#777', marginBottom: 22, borderTop: '1px solid #eee', paddingTop: 10 }}>
        <div>Gesamtdauer: {totalDuration} min</div>
        <div style={{ fontWeight: 600, color: '#111' }}>Total: CHF {totalPrice}</div>
      </div>

      {saveError && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{saveError}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
          {saving ? 'Speichert…' : 'Speichern'}
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate('/kasse', { state: { appointmentId } })}>
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
