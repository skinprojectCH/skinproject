import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  fetchArtistById,
  updateArtist,
  fetchAppointmentsForArtistRange,
  fetchAppointmentIdsWithPhotos,
  fetchArtistEarnings,
  fetchDocumentsForAppointment,
  uploadCustomerFile,
  getCustomerFileUrl,
  deleteCustomerDocument,
  updateAppointment,
  deleteAppointment,
  fetchCustomers,
  fetchServices,
  fetchServiceCategories,
  fetchAppointmentLineItems,
  createAppointment,
  addAppointmentLineItems,
  replaceAppointmentLineItems,
  type Artist,
  type Customer,
  type Service,
  type ServiceCategory,
  type CustomerDocument,
  type ArtistEarningEntry,
} from '../../lib/queries';
import { formatCHF } from '../../lib/format';
import NewCustomerModal from '../../components/NewCustomerModal';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function shiftISO(dateISO: string, days: number) {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  gebucht: { label: 'Gebucht', color: '#777' },
  kassiert: { label: 'Kassiert', color: 'var(--color-accent)' },
  storniert: { label: 'Abgesagt', color: 'var(--color-destructive)' },
  nicht_erschienen: { label: 'Nicht erschienen', color: 'var(--color-destructive)' },
};

// ============================================================
// PIN-Pad
// ============================================================
function PinPad({ pin, setPin, onSubmit, loading, maxLen = 6 }: { pin: string; setPin: (v: string) => void; onSubmit: () => void; loading: boolean; maxLen?: number }) {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  function press(d: string) {
    if (d === '') return;
    if (d === '⌫') {
      setPin(pin.slice(0, -1));
      return;
    }
    if (pin.length < maxLen) setPin(pin + d);
  }

  return (
    <div style={{ width: '100%', maxWidth: 300 }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
        {Array.from({ length: Math.max(pin.length, 4) }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.5)',
              background: i < pin.length ? '#fff' : 'transparent',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {digits.map((d, i) => (
          <button
            key={i}
            onClick={() => press(d)}
            disabled={d === '' || loading}
            style={{
              visibility: d === '' ? 'hidden' : 'visible',
              height: 62,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              fontSize: 20,
              fontFamily: 'var(--font-heading)',
              cursor: 'pointer',
            }}
          >
            {d}
          </button>
        ))}
      </div>
      <button
        className="btn btn-primary"
        style={{ width: '100%', justifyContent: 'center', marginTop: 24, background: 'var(--color-accent)', border: 'none', opacity: pin.length >= 4 && !loading ? 1 : 0.4 }}
        disabled={pin.length < 4 || loading}
        onClick={onSubmit}
      >
        {loading ? 'Prüft…' : 'Anmelden'}
      </button>
    </div>
  );
}

// ============================================================
// Login-Screen
// ============================================================
function ArtistLoginScreen({ artistId, onLoggedIn }: { artistId: string; onLoggedIn: (artist: Artist) => void }) {
  const [name, setName] = useState<string | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/artist-info?id=${artistId}`)
      .then((r) => r.json())
      .then((body) => {
        if (body.error) {
          setInfoError(body.error);
        } else {
          setName(body.name);
          if (!body.pinConfigured) setInfoError('Für diesen Account ist noch kein PIN eingerichtet. Bitte Admin kontaktieren.');
        }
      })
      .catch(() => setInfoError('Verbindung fehlgeschlagen.'));
  }, [artistId]);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/artist-pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId, pin }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Login fehlgeschlagen.');
      const { error: sessionError } = await supabase.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token });
      if (sessionError) throw sessionError;
      const artist = await fetchArtistById(artistId);
      onLoggedIn(artist);
    } catch (e: any) {
      setError(e.message);
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'var(--font-body)',
      }}
    >
      <img src="/logo-skinproject.png" alt="SkinProject" style={{ width: 96, height: 96, marginBottom: 20 }} />
      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 32, textAlign: 'center' }}>
        {name ? `Hallo ${name}` : '\u00A0'}
      </div>

      {infoError ? (
        <div style={{ fontSize: 13, color: 'var(--color-destructive)', textAlign: 'center', maxWidth: 280 }}>{infoError}</div>
      ) : (
        <>
          <PinPad pin={pin} setPin={setPin} onSubmit={handleSubmit} loading={loading} />
          {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginTop: 16, textAlign: 'center' }}>{error}</div>}
        </>
      )}
    </div>
  );
}

// ============================================================
// Foto-Lightbox (geteilt)
// ============================================================
function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <img src={url} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '85vh', borderRadius: 6 }} />
      <div onClick={onClose} style={{ position: 'fixed', top: 20, right: 20, color: '#fff', fontSize: 26 }}>✕</div>
    </div>
  );
}

// ============================================================
// Termin buchen / ändern (gemeinsames Formular)
// ============================================================
const formBoxStyle: React.CSSProperties = { border: '1px solid var(--color-border)', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' };

function formFieldLabel(text: string) {
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

function TerminForm({
  artistId,
  locationId,
  editAppointment,
  onSaved,
  onCancel,
}: {
  artistId: string;
  locationId: string | null;
  editAppointment?: any | null; // vorhandener Termin = Bearbeiten-Modus, sonst Neu-Buchen
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!editAppointment;
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('14:00');
  const [selectedServices, setSelectedServices] = useState<string[]>(['']);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchCustomers(),
      fetchServices(),
      fetchServiceCategories(),
      isEdit ? fetchAppointmentLineItems(editAppointment.id) : Promise.resolve([]),
    ])
      .then(([c, s, cats, lineItems]) => {
        setCustomers(c);
        setServices(s.filter((sv) => sv.active));
        setCategories(cats);
        if (isEdit) {
          setSelectedCustomer(editAppointment.customer_id || '');
          setDate(toDateInput(editAppointment.start_time));
          setTime(toTimeInput(editAppointment.start_time));
          setSelectedServices((lineItems as any[]).length ? (lineItems as any[]).map((li) => li.service_id) : ['']);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalDuration = selectedServices.reduce((sum, id) => sum + (services.find((s) => s.id === id)?.duration_minutes || 0), 0);
  const totalPrice = selectedServices.reduce((sum, id) => sum + (services.find((s) => s.id === id)?.price || 0), 0);

  async function handleSave() {
    if (!date || !time) {
      setError('Bitte Datum und Zeit auswählen.');
      return;
    }
    if (!selectedServices.some((id) => id)) {
      setError('Bitte mindestens einen Service auswählen.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const startDate = new Date(`${date}T${time}:00`);
      const startISO = startDate.toISOString();
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + (totalDuration || 30));

      const lineItems = selectedServices
        .map((id) => services.find((s) => s.id === id))
        .filter((s): s is Service => !!s)
        .map((s) => ({ service_id: s.id, quantity: 1, unit_price: s.price }));

      if (isEdit) {
        await updateAppointment(editAppointment.id, {
          customer_id: selectedCustomer || null,
          start_time: startISO,
          end_time: endDate.toISOString(),
        });
        await replaceAppointmentLineItems(editAppointment.id, lineItems);
      } else {
        const created = await createAppointment({
          customer_id: selectedCustomer || null,
          artist_id: artistId,
          location_id: locationId || null,
          start_time: startISO,
          end_time: endDate.toISOString(),
          type: 'termin',
        });
        await addAppointmentLineItems(created.id, lineItems);
      }
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>;

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        {formFieldLabel('Kunde')}
        <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} style={formBoxStyle}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          {formFieldLabel('Datum')}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...formBoxStyle, width: '100%', maxWidth: '100%' }} />
        </div>
        <div style={{ minWidth: 0 }}>
          {formFieldLabel('Startzeit')}
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...formBoxStyle, width: '100%', maxWidth: '100%' }} />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        {formFieldLabel('Services')}
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ ...formBoxStyle, marginBottom: 8, color: categoryFilter ? '#111' : '#777' }}>
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
                style={{ ...formBoxStyle, flex: 1, color: id ? '#111' : '#777' }}
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

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#777', marginBottom: 16, borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
        <div>Gesamtdauer: {totalDuration} min</div>
        <div style={{ fontWeight: 600, color: '#111' }}>Total: {formatCHF(totalPrice)}</div>
      </div>

      {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onCancel}>
          Abbrechen
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
          {saving ? 'Speichert…' : isEdit ? 'Speichern' : 'Termin buchen'}
        </button>
      </div>

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

// ============================================================
// Termin-Detail: Notiz, Dokumente & Fotos
// ============================================================
function AppointmentDetail({ appt, artistId, locationId, onClose }: { appt: any; artistId: string; locationId: string | null; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notes, setNotes] = useState(appt.notes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photos, setPhotos] = useState<CustomerDocument[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function reload() {
    setLoadingFiles(true);
    fetchDocumentsForAppointment(appt.id)
      .then((all) => {
        setPhotos(all.filter((d) => d.type === 'photo'));
      })
      .catch((e) => setFileError(e.message))
      .finally(() => setLoadingFiles(false));
  }

  useEffect(reload, [appt.id]);

  useEffect(() => {
    const missing = photos.filter((p) => !photoUrls[p.id]);
    if (missing.length === 0) return;
    Promise.all(missing.map(async (p) => [p.id, await getCustomerFileUrl(p.storage_path)] as const)).then((results) => {
      setPhotoUrls((prev) => {
        const next = { ...prev };
        for (const [id, url] of results) next[id] = url;
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  async function handleDeleteAppointment() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAppointment(appt.id);
      onClose();
    } catch (e: any) {
      setDeleteError(e.message);
      setDeleting(false);
    }
  }

  async function handleNotesBlur() {
    setSaving(true);
    try {
      await updateAppointment(appt.id, { notes: notes.trim() || null });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setFileError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!appt.customer_id) {
      setFileError('Diesem Termin ist kein Kundenprofil zugeordnet — Foto kann nicht gespeichert werden.');
      return;
    }
    setFileError(null);
    setUploadingPhoto(true);
    try {
      await uploadCustomerFile(appt.customer_id, file, 'photo', appt.id);
      await new Promise<void>((resolve) => {
        setLoadingFiles(true);
        fetchDocumentsForAppointment(appt.id)
          .then((all) => setPhotos(all.filter((d) => d.type === 'photo')))
          .catch((e) => setFileError(e.message))
          .finally(() => {
            setLoadingFiles(false);
            resolve();
          });
      });
    } catch (e: any) {
      setFileError(e.message || 'Foto konnte nicht hochgeladen werden.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleDelete(doc: CustomerDocument) {
    try {
      await deleteCustomerDocument(doc);
      reload();
    } catch (e: any) {
      setFileError(e.message);
    }
  }

  const services = (appt.appointment_line_items || []).map((li: any) => li.services?.name).filter(Boolean);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--color-bg)', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <button
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-accent)',
            borderRadius: 14,
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--color-accent)',
            cursor: 'pointer',
            padding: '5px 12px 5px 8px',
            flexShrink: 0,
          }}
        >
          ‹ Zurück
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {appt.customers ? `${appt.customers.vorname} ${appt.customers.name}` : 'Laufkunde'}
          </div>
          <div style={{ fontSize: 12, color: '#777' }}>
            {new Date(appt.start_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} · {services.join(', ') || '—'}
            {appt.locations?.name ? ` · ${appt.locations.name}` : ''}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {appt.status === 'gebucht' && (
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 16, background: 'var(--color-surface)' }}>
            {editing ? (
              <TerminForm
                artistId={artistId}
                locationId={locationId}
                editAppointment={appt}
                onCancel={() => setEditing(false)}
                onSaved={() => {
                  setEditing(false);
                  onClose();
                }}
              />
            ) : (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Termin</div>

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ color: '#777' }}>Kunde</div>
                    <div style={{ fontWeight: 600 }}>{appt.customers ? `${appt.customers.vorname} ${appt.customers.name}` : 'Laufkunde'}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ color: '#777' }}>Salon</div>
                    <div style={{ fontWeight: 600 }}>{appt.locations?.name || '—'}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ color: '#777' }}>Datum</div>
                    <div style={{ fontWeight: 600 }}>{new Date(appt.start_time).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ color: '#777' }}>Zeit</div>
                    <div style={{ fontWeight: 600 }}>
                      {new Date(appt.start_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                      {appt.end_time ? ` – ${new Date(appt.end_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 4, paddingTop: 8 }}>
                    <div style={{ color: '#777', marginBottom: 4 }}>Services</div>
                    {(appt.appointment_line_items || []).length === 0 ? (
                      <div style={{ color: '#999' }}>—</div>
                    ) : (
                      (appt.appointment_line_items || []).map((li: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <div>{li.services?.name || '—'}</div>
                          <div style={{ color: '#777' }}>{formatCHF(li.unit_price)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {!confirmDelete && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => {
                        setEditing(true);
                        setConfirmDelete(false);
                      }}
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="btn btn-destructive"
                      style={{ flex: 1, justifyContent: 'center', background: 'var(--color-destructive)', color: '#fff' }}
                      onClick={() => setConfirmDelete(true)}
                    >
                      Löschen
                    </button>
                  </div>
                )}

                {confirmDelete && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>Termin wirklich löschen? Das kann nicht rückgängig gemacht werden.</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmDelete(false)}>
                        Doch nicht
                      </button>
                      <button
                        className="btn btn-destructive"
                        style={{ flex: 1, justifyContent: 'center', background: 'var(--color-destructive)', color: '#fff', opacity: deleting ? 0.6 : 1 }}
                        disabled={deleting}
                        onClick={handleDeleteAppointment}
                      >
                        {deleting ? 'Löscht…' : 'Wirklich löschen'}
                      </button>
                    </div>
                    {deleteError && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 8 }}>{deleteError}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 16, background: 'var(--color-surface)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Notiz</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', minHeight: 70, fontFamily: 'var(--font-body)' }}
            placeholder="z.B. Beobachtungen, Nachbehandlung, nächste Session…"
          />
          {saving && <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>Speichert…</div>}
          {saved && <div style={{ fontSize: 11, color: '#1a7a3f', marginTop: 6 }}>✓ Gespeichert.</div>}
        </div>

        <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 16, background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Fotos</div>
            {!loadingFiles && appt.customer_id && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: photos.length > 0 ? '#1a7a3f' : 'var(--color-destructive)' }}>
                {photos.length > 0 ? '✓ Fotos ok' : '⚠ Fotos fehlen'}
              </div>
            )}
          </div>
          {!appt.customer_id ? (
            <div style={{ fontSize: 12, color: '#999' }}>Laufkunde ohne Kundenprofil — Fotodokumentation nicht erforderlich.</div>
          ) : (
            <>
              {!loadingFiles && photos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
                  {photos.map((p) => (
                    <div key={p.id} style={{ position: 'relative' }}>
                      <div
                        onClick={() => setLightboxUrl(photoUrls[p.id] || null)}
                        style={{ aspectRatio: '1', background: 'var(--color-bg)', borderRadius: 4, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#999', cursor: 'pointer' }}
                      >
                        {photoUrls[p.id] ? <img src={photoUrls[p.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'Foto'}
                      </div>
                      <div
                        onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                        style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        ✕
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!loadingFiles && photos.length === 0 && <div style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>Noch keine Fotos.</div>}
              <input ref={photoInputRef} type="file" accept="image/*" style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }} onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
              <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
                {uploadingPhoto ? 'Lädt hoch…' : 'Foto hinzufügen'}
              </button>
            </>
          )}
        </div>

        {fileError && <div style={{ fontSize: 12, color: 'var(--color-destructive)' }}>{fileError}</div>}
      </div>

      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}

// ============================================================
// Termine-Tab: einfache Liste ±30 Tage um heute, "Heute"-Button
// ============================================================
function formatDateHeader(dateISO: string) {
  const today = todayISO();
  if (dateISO === today) return 'Heute';
  if (dateISO === shiftISO(today, 1)) return 'Morgen';
  return new Date(dateISO).toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' });
}

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return `rgba(176,141,61,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

function TermineTab({ artistId, locationId, artistColor }: { artistId: string; locationId: string | null; artistColor: string }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [idsWithPhotos, setIdsWithPhotos] = useState<Set<string>>(new Set());
  const apptRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function reload() {
    setLoading(true);
    setError(null);
    fetchAppointmentsForArtistRange(artistId, shiftISO(todayISO(), -30), shiftISO(todayISO(), 30))
      .then((appts) => {
        setAppointments(appts);
        fetchAppointmentIdsWithPhotos(appts.map((a: any) => a.id)).then(setIdsWithPhotos);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(reload, [artistId]);

  // Ziel ist nicht stur "heute", sondern der erste noch offene Termin (Status "gebucht") —
  // ist der heutige Tag bereits komplett abgeschlossen (alles kassiert/nicht erschienen),
  // springt es direkt zum nächsten Tag mit offenen Terminen.
  const upcoming = [...appointments].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const nowIso = new Date().toISOString();
  const firstUpcoming = upcoming.find((a) => a.status === 'gebucht') || upcoming.find((a) => a.start_time >= nowIso);
  const scrollTargetId = firstUpcoming?.id || null;

  function scrollToUpcoming(behavior: ScrollBehavior = 'smooth') {
    if (scrollTargetId && apptRefs.current[scrollTargetId]) {
      apptRefs.current[scrollTargetId]?.scrollIntoView({ behavior, block: 'start' });
    }
  }

  useEffect(() => {
    if (!loading) {
      // kurz warten, bis die Refs nach dem Render gesetzt sind
      requestAnimationFrame(() => scrollToUpcoming('auto'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  function cardStyleFor(status: string): React.CSSProperties {
    let background = hexToRgba(artistColor, 0.1);
    if (status === 'kassiert') background = hexToRgba(artistColor, 0.24);
    else if (status === 'nicht_erschienen') background = hexToRgba('#8B5A5A', 0.12);
    return { border: '1px solid var(--color-border)', borderRadius: 8, padding: '14px 16px', background, cursor: 'pointer' };
  }

  const grouped = (() => {
    const map: Record<string, any[]> = {};
    for (const appt of appointments) {
      const d = appt.start_time.slice(0, 10);
      (map[d] ||= []).push(appt);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  })();

  const today = todayISO();

  return (
    <div>
      <div
        style={{
          position: 'sticky',
          top: 64,
          zIndex: 10,
          background: 'var(--color-bg)',
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '16px 0 14px',
          marginBottom: 2,
        }}
      >
        <div onClick={() => scrollToUpcoming()} style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-accent)', fontWeight: 700, cursor: 'pointer', border: '1px solid var(--color-accent)', borderRadius: 14, padding: '6px 14px', background: 'var(--color-surface)' }}>
          Heute
        </div>
      </div>

      {loading && <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>}
      {error && <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>{error}</div>}
      {!loading && !error && appointments.length === 0 && <div style={{ fontSize: 13, color: '#999' }}>Keine Termine in diesem Zeitraum.</div>}

      {!loading &&
        grouped.map(([dateKey, appts]) => (
          <div key={dateKey} style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: dateKey === today ? 'var(--color-accent)' : '#999',
                marginBottom: 8,
              }}
            >
              {formatDateHeader(dateKey)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {appts.map((appt) => {
                const statusInfo = STATUS_LABELS[appt.status] || STATUS_LABELS.gebucht;
                const services = (appt.appointment_line_items || []).map((li: any) => li.services?.name).filter(Boolean);
                return (
                  <div
                    key={appt.id}
                    ref={(el) => {
                      apptRefs.current[appt.id] = el;
                    }}
                    onClick={() => setSelected(appt)}
                    style={{ ...cardStyleFor(appt.status), scrollMarginTop: 130 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                          {new Date(appt.start_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                          {appt.end_time ? `–${new Date(appt.end_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}` : ''} · {appt.customers ? `${appt.customers.vorname} ${appt.customers.name}` : 'Laufkunde'}
                        </div>
                        <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>
                          {services.join(', ') || '—'}
                          {appt.locations?.name ? ` · ${appt.locations.name}` : ''}
                        </div>
                        {appt.status !== 'storniert' && appt.customer_id && (
                          <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: idsWithPhotos.has(appt.id) ? '#1a7a3f' : 'var(--color-destructive)' }}>
                            {idsWithPhotos.has(appt.id) ? '✓ Fotos ok' : '⚠ Fotos fehlen'}
                          </div>
                        )}
                      </div>
                      <div style={{ border: `1px solid ${statusInfo.color}`, color: statusInfo.color, borderRadius: 10, padding: '2px 10px', fontSize: 10, fontWeight: 600, flexShrink: 0, textTransform: 'uppercase' }}>
                        {statusInfo.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      {!loading && <div style={{ minHeight: '75vh' }} aria-hidden />}

      {selected && <AppointmentDetail appt={selected} artistId={artistId} locationId={locationId} onClose={() => { setSelected(null); reload(); }} />}
    </div>
  );
}

// ============================================================
// Umsatz-Tab
// ============================================================
const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

async function downloadEarningsPdf(opts: { title: string; subtitle: string; artistName: string; rows: { label: string; amount: number }[]; total: number }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(16);
  doc.text(opts.title, 14, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`${opts.artistName} · ${opts.subtitle}`, 14, y);
  y += 12;
  doc.setTextColor(0);
  doc.setFontSize(11);
  for (const row of opts.rows) {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(row.label, 14, y);
    doc.text(formatCHF(row.amount), 196, y, { align: 'right' });
    y += 7;
  }
  if (opts.rows.length === 0) {
    doc.setTextColor(150);
    doc.text('Keine Einträge in diesem Zeitraum.', 14, y);
    y += 7;
    doc.setTextColor(0);
  }
  y += 4;
  doc.setDrawColor(200);
  doc.line(14, y, 196, y);
  y += 9;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Total (dein Anteil)', 14, y);
  doc.text(formatCHF(opts.total), 196, y, { align: 'right' });
  doc.save(`${opts.title.replace(/[^\w-]+/g, '_')}.pdf`);
}

function UmsatzTag({ artistId, sharePct }: { artistId: string; sharePct: number }) {
  const [date, setDate] = useState(todayISO());
  const [entries, setEntries] = useState<ArtistEarningEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchArtistEarnings(artistId, date, date, sharePct)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [artistId, date, sharePct]);

  const total = entries.reduce((s, e) => s + e.amount, 0);

  const byLocation = (() => {
    const map: Record<string, ArtistEarningEntry[]> = {};
    for (const e of entries) (map[e.locationName] ||= []).push(e);
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  })();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => setDate(shiftISO(date, -1))} style={periodNavBtnStyle}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{formatDateHeader(date)}</div>
          {date !== todayISO() && (
            <div onClick={() => setDate(todayISO())} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer', marginTop: 2 }}>
              Heute
            </div>
          )}
        </div>
        <button onClick={() => setDate(shiftISO(date, 1))} style={periodNavBtnStyle}>›</button>
      </div>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '16px 18px', background: 'var(--color-surface)', marginBottom: 16 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', marginBottom: 6 }}>Dein Anteil (alle Standorte)</div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{formatCHF(total)}</div>
        {byLocation.length > 1 && (
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            Achtung: unterschiedliche Standorte sind separate Firmen — siehe Aufteilung unten.
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>
      ) : entries.length === 0 ? (
        <div style={{ fontSize: 13, color: '#999' }}>Keine Einträge an diesem Tag.</div>
      ) : (
        byLocation.map(([locationName, locEntries]) => {
          const locTotal = locEntries.reduce((s, e) => s + e.amount, 0);
          return (
            <div key={locationName} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>{locationName}</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{formatCHF(locTotal)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {locEntries.map((e) => (
                  <div key={e.appointmentId} style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: '10px 14px', background: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{e.customerLabel}</div>
                      <div style={{ fontSize: 11, color: '#777' }}>{e.services.join(', ') || '—'}</div>
                    </div>
                    <div style={{ fontWeight: 700 }}>{formatCHF(e.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function UmsatzMonat({ artistId, artistName, sharePct }: { artistId: string; artistName: string; sharePct: number }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11
  const [entries, setEntries] = useState<ArtistEarningEntry[]>([]);
  const [loading, setLoading] = useState(true);

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
  }

  useEffect(() => {
    setLoading(true);
    const start = `${year}-${pad2(month + 1)}-01`;
    const endDate = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${pad2(month + 1)}-${pad2(endDate)}`;
    fetchArtistEarnings(artistId, start, end, sharePct)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [artistId, year, month, sharePct]);

  const total = entries.reduce((s, e) => s + e.amount, 0);

  const byLocation = (() => {
    const map: Record<string, ArtistEarningEntry[]> = {};
    for (const e of entries) (map[e.locationName] ||= []).push(e);
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  })();

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => shiftMonth(-1)} style={periodNavBtnStyle}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{MONTH_NAMES[month]} {year}</div>
          {!isCurrentMonth && (
            <div onClick={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); }} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer', marginTop: 2 }}>
              Aktueller Monat
            </div>
          )}
        </div>
        <button onClick={() => shiftMonth(1)} style={periodNavBtnStyle}>›</button>
      </div>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '16px 18px', background: 'var(--color-surface)', marginBottom: 16 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', marginBottom: 6 }}>Dein Anteil diesen Monat (alle Standorte)</div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{formatCHF(total)}</div>
        {byLocation.length > 1 && (
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Standorte sind separate Firmen — je eigene Aufstellung + PDF unten.</div>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>
      ) : byLocation.length === 0 ? (
        <div style={{ fontSize: 13, color: '#999' }}>Keine Einträge in diesem Monat.</div>
      ) : (
        byLocation.map(([locationName, locEntries]) => {
          const locByDay = (() => {
            const map: Record<string, number> = {};
            for (const e of locEntries) map[e.date] = (map[e.date] || 0) + e.amount;
            return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
          })();
          const locTotal = locEntries.reduce((s, e) => s + e.amount, 0);
          return (
            <div key={locationName} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent)' }}>{locationName}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{formatCHF(locTotal)}</div>
              </div>
              <button
                className="btn btn-outline"
                style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
                onClick={() =>
                  downloadEarningsPdf({
                    title: `Umsatz ${MONTH_NAMES[month]} ${year} · ${locationName}`,
                    subtitle: `${MONTH_NAMES[month]} ${year} · ${locationName}`,
                    artistName,
                    rows: locByDay.map(([d, amt]) => ({ label: new Date(d).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit' }), amount: amt })),
                    total: locTotal,
                  })
                }
              >
                PDF herunterladen ({locationName})
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {locByDay.map(([d, amt]) => (
                  <div key={d} style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: '9px 14px', background: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <div>{new Date(d).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit' })}</div>
                    <div style={{ fontWeight: 600 }}>{formatCHF(amt)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function UmsatzJahr({ artistId, artistName, sharePct }: { artistId: string; artistName: string; sharePct: number }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [entries, setEntries] = useState<ArtistEarningEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchArtistEarnings(artistId, `${year}-01-01`, `${year}-12-31`, sharePct)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [artistId, year, sharePct]);

  const total = entries.reduce((s, e) => s + e.amount, 0);

  const byLocation = (() => {
    const map: Record<string, ArtistEarningEntry[]> = {};
    for (const e of entries) (map[e.locationName] ||= []).push(e);
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  })();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => setYear((y) => y - 1)} style={periodNavBtnStyle}>‹</button>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{year}</div>
        <button onClick={() => setYear((y) => y + 1)} style={periodNavBtnStyle}>›</button>
      </div>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '16px 18px', background: 'var(--color-surface)', marginBottom: 16 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', marginBottom: 6 }}>Dein Anteil {year} (alle Standorte)</div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{formatCHF(total)}</div>
        {byLocation.length > 1 && (
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Standorte sind separate Firmen — je eigene Aufstellung + PDF unten.</div>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>
      ) : byLocation.length === 0 ? (
        <div style={{ fontSize: 13, color: '#999' }}>Keine Einträge in diesem Jahr.</div>
      ) : (
        byLocation.map(([locationName, locEntries]) => {
          const locByMonth = (() => {
            const map: Record<string, number> = {};
            for (const e of locEntries) {
              const key = e.date.slice(0, 7);
              map[key] = (map[key] || 0) + e.amount;
            }
            return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
          })();
          const locTotal = locEntries.reduce((s, e) => s + e.amount, 0);
          return (
            <div key={locationName} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent)' }}>{locationName}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{formatCHF(locTotal)}</div>
              </div>
              <button
                className="btn btn-outline"
                style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
                onClick={() =>
                  downloadEarningsPdf({
                    title: `Umsatz ${year} · ${locationName}`,
                    subtitle: `Jahr ${year} · ${locationName}`,
                    artistName,
                    rows: locByMonth.map(([m, amt]) => ({ label: MONTH_NAMES[Number(m.slice(5, 7)) - 1], amount: amt })),
                    total: locTotal,
                  })
                }
              >
                PDF herunterladen ({locationName})
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {locByMonth.map(([m, amt]) => (
                  <div key={m} style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: '9px 14px', background: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <div>{MONTH_NAMES[Number(m.slice(5, 7)) - 1]}</div>
                    <div style={{ fontWeight: 600 }}>{formatCHF(amt)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

const periodNavBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 16,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-accent)',
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
};

function UmsatzTab({ artist }: { artist: Artist }) {
  const [period, setPeriod] = useState<'tag' | 'monat' | 'jahr'>('tag');
  const sharePct = artist.revenue_share_pct || 0;
  const artistName = artist.kuenstlername || artist.name;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['tag', 'monat', 'jahr'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`payment-method-btn${period === p ? ' payment-method-btn--selected' : ''}`}
            style={{ flex: 1 }}
          >
            {p === 'tag' ? 'Tag' : p === 'monat' ? 'Monat' : 'Jahr'}
          </button>
        ))}
      </div>

      {period === 'tag' && <UmsatzTag artistId={artist.id} sharePct={sharePct} />}
      {period === 'monat' && <UmsatzMonat artistId={artist.id} artistName={artistName} sharePct={sharePct} />}
      {period === 'jahr' && <UmsatzJahr artistId={artist.id} artistName={artistName} sharePct={sharePct} />}

      <div style={{ fontSize: 11, color: '#999', lineHeight: 1.5, marginTop: 16 }}>
        Zeigt deinen eigenen Anteil (Miet- & Serviceanteil {sharePct}%) auf bezahlte Dienstleistungen zu deinen Terminen. Artikelverkäufe sind nicht enthalten.
      </div>
    </div>
  );
}

// ============================================================
// Bottom-Nav Icons
// ============================================================
function NavIcon({ type }: { type: 'agenda' | 'buchen' | 'abschluesse' | 'profil' }) {
  const props = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (type === 'agenda')
    return (
      <svg {...props}>
        <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
        <path d="M3.5 10h17" />
        <path d="M8 3v4M16 3v4" />
      </svg>
    );
  if (type === 'buchen')
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    );
  if (type === 'abschluesse')
    return (
      <svg {...props}>
        <path d="M12 12V3.5A8.5 8.5 0 1 1 3.5 12H12z" />
        <path d="M12 12L20 8" />
      </svg>
    );
  return (
    <svg {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1-4 4-6 7.5-6s6.5 2 7.5 6" />
    </svg>
  );
}

// ============================================================
// Profil-Tab (M7)
// ============================================================
function ProfilTab({ artist, onUpdated, onLogout }: { artist: Artist; onUpdated: (a: Artist) => void; onLogout: () => void }) {
  const [name, setName] = useState(artist.name);
  const [vorname, setVorname] = useState(artist.kuenstlername || '');
  const [strasse, setStrasse] = useState(artist.strasse || '');
  const [plzOrt, setPlzOrt] = useState(artist.plz_ort || '');
  const [phone, setPhone] = useState(artist.phone || '');
  const [email, setEmail] = useState(artist.email || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pinInput, setPinInput] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const patch = {
        name: name.trim(),
        kuenstlername: vorname.trim() || null,
        strasse: strasse.trim() || null,
        plz_ort: plzOrt.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
      };
      await updateArtist(artist.id, patch);
      onUpdated({ ...artist, ...patch });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSetPin() {
    if (!/^\d{4,6}$/.test(pinInput)) {
      setPinError('PIN muss 4 bis 6 Ziffern haben.');
      return;
    }
    setPinSaving(true);
    setPinError(null);
    setPinSuccess(false);
    try {
      const res = await fetch('/api/create-artist-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId: artist.id, pin: pinInput }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Unbekannter Fehler.');
      setPinSuccess(true);
      setPinInput('');
    } catch (e: any) {
      setPinError(e.message);
    } finally {
      setPinSaving(false);
    }
  }

  const fieldBox: React.CSSProperties = { border: '1px solid var(--color-border)', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' };
  const label: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', color: '#999', marginBottom: 4, fontWeight: 600 };

  return (
    <div>
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 16, background: 'var(--color-surface)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Mein Profil</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={label}>Name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={fieldBox} />
          </div>
          <div>
            <div style={label}>Künstlername</div>
            <input value={vorname} onChange={(e) => setVorname(e.target.value)} style={fieldBox} placeholder="optional" />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={label}>Strasse</div>
          <input value={strasse} onChange={(e) => setStrasse(e.target.value)} style={fieldBox} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={label}>PLZ / Ort</div>
            <input value={plzOrt} onChange={(e) => setPlzOrt(e.target.value)} style={fieldBox} />
          </div>
          <div>
            <div style={label}>Telefon</div>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} style={fieldBox} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={label}>E-Mail</div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={fieldBox} type="email" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 12, marginBottom: 4 }}>
          <div style={{ fontSize: 12, color: '#777' }}>Miet- &amp; Serviceanteil</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{artist.revenue_share_pct}%</div>
            <div style={{ fontSize: 10, color: '#bbb' }}>nur durch Admin änderbar</div>
          </div>
        </div>

        {error && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 10 }}>{error}</div>}
        {saved && <div style={{ fontSize: 11, color: '#1a7a3f', marginTop: 10 }}>✓ Gespeichert.</div>}

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 14, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
          {saving ? 'Speichert…' : 'Speichern'}
        </button>
      </div>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 16, background: 'var(--color-surface)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>PIN ändern</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
            style={{ ...fieldBox, flex: 1 }}
            placeholder="Neuer 4–6-stelliger PIN"
            inputMode="numeric"
          />
          <button className="btn btn-secondary" style={{ whiteSpace: 'nowrap', opacity: pinSaving ? 0.6 : 1 }} disabled={pinSaving} onClick={handleSetPin}>
            {pinSaving ? '…' : 'Setzen'}
          </button>
        </div>
        {pinError && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 6 }}>{pinError}</div>}
        {pinSuccess && <div style={{ fontSize: 11, color: '#1a7a3f', marginTop: 6 }}>✓ PIN geändert.</div>}
      </div>

      <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={onLogout}>
        Abmelden
      </button>
    </div>
  );
}

// ============================================================
// Dashboard
// ============================================================
function ArtistDashboard({ artist: initialArtist, onLogout }: { artist: Artist; onLogout: () => void }) {
  const [tab, setTab] = useState<'agenda' | 'buchen' | 'abschluesse' | 'profil'>('agenda');
  const [artist, setArtist] = useState(initialArtist);
  const [bookingKey, setBookingKey] = useState(0);

  const NAV_ITEMS: { key: typeof tab; label: string }[] = [
    { key: 'agenda', label: 'Agenda' },
    { key: 'buchen', label: 'Buchen' },
    { key: 'abschluesse', label: 'Abschlüsse' },
    { key: 'profil', label: 'Profil' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: 'var(--font-body)', paddingBottom: 76 }}>
      <div style={{ background: 'var(--color-primary)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 20, height: 64, boxSizing: 'border-box' }}>
        <img src="/logo-skinproject.png" alt="" style={{ width: 36, height: 36, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-accent)' }}>SkinProject</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist.kuenstlername || artist.name}</div>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {tab === 'agenda' && <TermineTab artistId={artist.id} locationId={artist.location_id} artistColor={artist.calendar_color} />}
        {tab === 'buchen' && (
          <div key={bookingKey} style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, background: 'var(--color-surface)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Neuer Termin</div>
            <TerminForm
              artistId={artist.id}
              locationId={artist.location_id}
              onCancel={() => setTab('agenda')}
              onSaved={() => {
                setBookingKey((k) => k + 1);
                setTab('agenda');
              }}
            />
          </div>
        )}
        {tab === 'abschluesse' && <UmsatzTab artist={artist} />}
        {tab === 'profil' && <ProfilTab artist={artist} onUpdated={setArtist} onLogout={onLogout} />}
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          zIndex: 50,
        }}
      >
        {NAV_ITEMS.map((item) => (
          <div
            key={item.key}
            onClick={() => setTab(item.key)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '10px 0 8px',
              color: tab === item.key ? 'var(--color-accent)' : '#999',
              cursor: 'pointer',
            }}
          >
            <NavIcon type={item.key} />
            <div style={{ fontSize: 10, fontWeight: tab === item.key ? 700 : 400 }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Entry point
// ============================================================
export default function ArtistApp() {
  const { artistId } = useParams();
  const [phase, setPhase] = useState<'loading' | 'login' | 'dashboard'>('loading');
  const [artist, setArtist] = useState<Artist | null>(null);

  useEffect(() => {
    if (!artistId) return;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setPhase('login');
        return;
      }
      try {
        const found = await fetchArtistById(artistId);
        setArtist(found);
        setPhase('dashboard');
      } catch {
        await supabase.auth.signOut();
        setPhase('login');
      }
    })();
  }, [artistId]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setArtist(null);
    setPhase('login');
  }

  if (!artistId) return null;
  if (phase === 'loading') return <div style={{ minHeight: '100vh', background: 'var(--color-primary)' }} />;
  if (phase === 'login') return <ArtistLoginScreen artistId={artistId} onLoggedIn={(a) => { setArtist(a); setPhase('dashboard'); }} />;
  if (phase === 'dashboard' && artist) return <ArtistDashboard artist={artist} onLogout={handleLogout} />;
  return null;
}
