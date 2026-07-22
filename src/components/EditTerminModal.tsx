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
  fetchArtistServiceIds,
  type Artist,
  type Customer,
  type Service,
  type ServiceCategory,
} from '../lib/queries';
import NewCustomerModal from './NewCustomerModal';
import { formatCHF } from '../lib/format';

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
  const [status, setStatus] = useState<string>('gebucht');

  const [artists, setArtists] = useState<Artist[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAppointment(appointmentId)
      .then((appt) => {
        if (appt.status === 'kassiert') {
          onClose();
          navigate('/kasse', { state: { appointmentId } });
          return null;
        }
        return Promise.all([Promise.resolve(appt), fetchAppointmentLineItems(appointmentId), fetchArtists(), fetchCustomers(), fetchServices(), fetchServiceCategories()]);
      })
      .then((result) => {
        if (!result) return;
        const [appt, lineItems, allArtists, allCustomers, allServices, allCategories] = result;
        setStatus(appt.status);
        setSelectedCustomer(appt.customer_id || '');
        setSelectedArtist(appt.artist_id || '');
        setDate(toDateInput(appt.start_time));
        setTime(toTimeInput(appt.start_time));
        setArtists(allArtists.filter((a) => a.status === 'active'));
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

  const [artistServiceIds, setArtistServiceIdsState] = useState<string[]>([]);
  useEffect(() => {
    if (!selectedArtist) {
      setArtistServiceIdsState([]);
      return;
    }
    fetchArtistServiceIds(selectedArtist)
      .then(setArtistServiceIdsState)
      .catch(() => setArtistServiceIdsState([]));
  }, [selectedArtist]);
  const allowedServices = artistServiceIds.length > 0 ? services.filter((s) => artistServiceIds.includes(s.id)) : services;

  async function saveChanges(): Promise<boolean> {
    if (!selectedArtist || !date || !time) {
      setSaveError('Bitte Artist, Datum und Zeit auswählen.');
      return false;
    }
    if (!selectedServices.some((id) => id)) {
      setSaveError('Bitte mindestens einen Service auswählen.');
      return false;
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

      return true;
    } catch (e: any) {
      setSaveError(e.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (await saveChanges()) onClose();
  }

  async function handleSaveAndCheckout() {
    // Wichtig: ungespeicherte Änderungen (z.B. gerade hinzugefügter Service) müssen vor dem
    // Wechsel zur Kasse persistiert sein, sonst fehlen sie dort und im Termin.
    if (await saveChanges()) {
      navigate('/kasse', { state: { appointmentId } });
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

  if (status === 'nicht_erschienen') {
    const customer = customers.find((c) => c.id === selectedCustomer);
    const artist = artists.find((a) => a.id === selectedArtist);

    return (
      <Modal title="Termin (nicht erschienen)" onClose={onClose}>
        <div
          style={{
            border: '1px solid var(--color-destructive)',
            background: '#F6ECEC',
            borderRadius: 6,
            padding: '10px 14px',
            marginBottom: 20,
            fontSize: 12,
            color: 'var(--color-destructive)',
            fontWeight: 600,
          }}
        >
          ✕ Dieser Termin wurde als "Nicht erschienen" markiert und ist abgeschlossen — keine Änderungen mehr möglich.
        </div>

        <div style={{ marginBottom: 14 }}>
          {fieldLabel('Kunde')}
          <div style={boxStyle}>{customer ? `${customer.vorname} ${customer.name}` : 'Laufkunde'}</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          {fieldLabel('Artist')}
          <div style={boxStyle}>{artist?.name || '—'}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            {fieldLabel('Datum')}
            <div style={boxStyle}>{date}</div>
          </div>
          <div>
            {fieldLabel('Startzeit')}
            <div style={boxStyle}>{time}</div>
          </div>
        </div>

        <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>
          Schliessen
        </button>
      </Modal>
    );
  }

  return (
    <>
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
        <div onClick={() => setShowNewCustomer(true)} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer', marginTop: 6 }}>
          + Neuen Kunden erfassen
        </div>
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
          {categories
            .filter((c) => allowedServices.some((s) => s.category_id === c.id))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        {selectedServices.map((id, index) => {
          const filteredServices = categoryFilter ? allowedServices.filter((s) => s.category_id === categoryFilter) : allowedServices;
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
        <div style={{ fontWeight: 600, color: '#111' }}>Total: {formatCHF(totalPrice)}</div>
      </div>

      {saveError && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{saveError}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
          {saving ? 'Speichert…' : 'Speichern'}
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSaveAndCheckout}>
          {saving ? 'Speichert…' : 'Kassieren'}
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
      {showNewCustomer && (
        <NewCustomerModal
          onClose={() => setShowNewCustomer(false)}
          onCreated={async (id) => {
            const updated = await fetchCustomers();
            setCustomers(updated);
            setSelectedCustomer(id);
            setShowNewCustomer(false);
          }}
        />
      )}
    </>
  );
}
