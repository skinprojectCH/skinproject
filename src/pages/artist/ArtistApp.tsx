import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  fetchArtistById,
  fetchAppointmentsForArtistRange,
  fetchArtistRevenueStats,
  fetchDocumentsForAppointment,
  uploadCustomerFile,
  getCustomerFileUrl,
  deleteCustomerDocument,
  updateAppointment,
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
        style={{ width: '100%', justifyContent: 'center', marginTop: 24, opacity: pin.length >= 4 && !loading ? 1 : 0.4 }}
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
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, letterSpacing: 1, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: 8 }}>
        SkinProject
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 32, textAlign: 'center' }}>
        {name ? `Hoi ${name}` : '\u00A0'}
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
        <div>
          {formFieldLabel('Datum')}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={formBoxStyle} />
        </div>
        <div>
          {formFieldLabel('Startzeit')}
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={formBoxStyle} />
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
        <div style={{ fontWeight: 600, color: '#111' }}>Total: CHF {totalPrice}</div>
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
  const [notes, setNotes] = useState(appt.notes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [docs, setDocs] = useState<CustomerDocument[]>([]);
  const [photos, setPhotos] = useState<CustomerDocument[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function reload() {
    setLoadingFiles(true);
    fetchDocumentsForAppointment(appt.id)
      .then((all) => {
        setDocs(all.filter((d) => d.type === 'document'));
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

  async function handleFile(file: File | undefined, type: 'document' | 'photo') {
    if (!file || !appt.customer_id) return;
    setFileError(null);
    type === 'document' ? setUploadingDoc(true) : setUploadingPhoto(true);
    try {
      await uploadCustomerFile(appt.customer_id, file, type, appt.id);
      reload();
    } catch (e: any) {
      setFileError(e.message);
    } finally {
      setUploadingDoc(false);
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
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 0 }}>‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {appt.customers ? `${appt.customers.vorname} ${appt.customers.name}` : 'Laufkunde'}
          </div>
          <div style={{ fontSize: 12, color: '#777' }}>
            {new Date(appt.start_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} · {services.join(', ') || '—'}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Termin</div>
                <div onClick={() => setEditing(true)} style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
                  Bearbeiten
                </div>
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
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Dokumente</div>
          {loadingFiles ? (
            <div style={{ fontSize: 12, color: '#999' }}>Lädt…</div>
          ) : (
            <>
              {docs.length === 0 ? (
                <div style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>Noch keine Dokumente.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {docs.map((doc) => (
                    <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 4, padding: '8px 10px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name || doc.storage_path.split('/').pop()}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <div
                          onClick={async () => {
                            const url = await getCustomerFileUrl(doc.storage_path);
                            window.open(url, '_blank');
                          }}
                          style={{ color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Öffnen
                        </div>
                        <div onClick={() => handleDelete(doc)} style={{ color: '#999', cursor: 'pointer' }}>✕</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          <input ref={docInputRef} type="file" style={{ display: 'none' }} onChange={(e) => { handleFile(e.target.files?.[0], 'document'); e.target.value = ''; }} />
          <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => docInputRef.current?.click()} disabled={uploadingDoc}>
            {uploadingDoc ? 'Lädt hoch…' : 'Dokument hinzufügen'}
          </button>
        </div>

        <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 16, background: 'var(--color-surface)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Fotos</div>
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
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { handleFile(e.target.files?.[0], 'photo'); e.target.value = ''; }} />
          <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
            {uploadingPhoto ? 'Lädt hoch…' : 'Foto hinzufügen'}
          </button>
        </div>

        {fileError && <div style={{ fontSize: 12, color: 'var(--color-destructive)' }}>{fileError}</div>}
      </div>

      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}

// ============================================================
// Termine-Tab: Tageskalender (Liste, keine Wochenansicht)
// ============================================================
const CHUNK_DAYS = 14;

function formatDateHeader(dateISO: string) {
  const today = todayISO();
  if (dateISO === today) return 'Heute';
  if (dateISO === shiftISO(today, 1)) return 'Morgen';
  return new Date(dateISO).toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' });
}

function TermineTab({ artistId, locationId }: { artistId: string; locationId: string | null }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeEndOffset, setRangeEndOffset] = useState(0);
  const [selected, setSelected] = useState<any | null>(null);
  const [showNew, setShowNew] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  async function loadChunk(fromOffset: number, toOffset: number, append: boolean) {
    const start = shiftISO(todayISO(), fromOffset);
    const end = shiftISO(todayISO(), toOffset);
    const data = await fetchAppointmentsForArtistRange(artistId, start, end);
    setAppointments((prev) => (append ? [...prev, ...data] : data));
  }

  function reload() {
    setLoading(true);
    setError(null);
    loadChunk(0, CHUNK_DAYS, false)
      .then(() => setRangeEndOffset(CHUNK_DAYS))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(reload, [artistId]);

  function loadMore() {
    if (loadingMore || loading) return;
    setLoadingMore(true);
    const newEnd = rangeEndOffset + CHUNK_DAYS;
    loadChunk(rangeEndOffset + 1, newEnd, true)
      .then(() => setRangeEndOffset(newEnd))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingMore(false));
  }

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeEndOffset, loading, loadingMore]);

  const grouped = (() => {
    const map: Record<string, any[]> = {};
    for (const appt of appointments) {
      const d = appt.start_time.slice(0, 10);
      (map[d] ||= []).push(appt);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  })();

  return (
    <div>
      <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }} onClick={() => setShowNew(true)}>
        + Neuer Termin
      </button>

      {loading && <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>}
      {error && <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>{error}</div>}
      {!loading && !error && appointments.length === 0 && <div style={{ fontSize: 13, color: '#999' }}>Keine kommenden Termine.</div>}

      {!loading &&
        grouped.map(([dateKey, appts]) => (
          <div key={dateKey} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', marginBottom: 8 }}>{formatDateHeader(dateKey)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {appts.map((appt) => {
                const statusInfo = STATUS_LABELS[appt.status] || STATUS_LABELS.gebucht;
                const services = (appt.appointment_line_items || []).map((li: any) => li.services?.name).filter(Boolean);
                return (
                  <div
                    key={appt.id}
                    onClick={() => setSelected(appt)}
                    style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '14px 16px', background: 'var(--color-surface)', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                          {new Date(appt.start_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} · {appt.customers ? `${appt.customers.vorname} ${appt.customers.name}` : 'Laufkunde'}
                        </div>
                        <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>{services.join(', ') || '—'}</div>
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

      <div ref={sentinelRef} style={{ height: 1 }} />
      {loadingMore && <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: '10px 0' }}>Lädt weitere Termine…</div>}

      {selected && <AppointmentDetail appt={selected} artistId={artistId} locationId={locationId} onClose={() => { setSelected(null); reload(); }} />}

      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--color-bg)', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
            <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 0 }}>‹</button>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Neuer Termin</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <TerminForm
              artistId={artistId}
              locationId={locationId}
              onCancel={() => setShowNew(false)}
              onSaved={() => {
                setShowNew(false);
                reload();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Umsatz-Tab
// ============================================================
function UmsatzTab({ artist }: { artist: Artist }) {
  const [stats, setStats] = useState<{ today: number; week: number; month: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArtistRevenueStats(artist.id)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [artist.id]);

  if (loading) return <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>;
  if (!stats) return null;

  const share = artist.revenue_share_pct || 0;

  const cards = [
    { label: 'Heute', value: stats.today },
    { label: 'Diese Woche', value: stats.week },
    { label: 'Dieser Monat', value: stats.month },
  ];

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '16px 18px', background: 'var(--color-surface)' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{formatCHF(c.value)}</div>
            {share > 0 && <div style={{ fontSize: 12, color: 'var(--color-accent)', marginTop: 4 }}>Dein Anteil (~{share}%): {formatCHF((c.value * share) / 100)}</div>}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#999', lineHeight: 1.5 }}>
        Werte basieren auf bezahlten Bestellungen zu deinen Terminen. Der Anteil ist eine Näherung auf den Gesamtbetrag (nicht nach Dienstleistung/Artikel aufgeschlüsselt).
      </div>
    </div>
  );
}

// ============================================================
// Dashboard
// ============================================================
function ArtistDashboard({ artist, onLogout }: { artist: Artist; onLogout: () => void }) {
  const [tab, setTab] = useState<'termine' | 'umsatz'>('termine');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: 'var(--font-body)' }}>
      <div style={{ background: 'var(--color-primary)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-accent)' }}>SkinProject</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{artist.kuenstlername || artist.name}</div>
        </div>
        <button onClick={onLogout} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: '#eee', borderRadius: 4, padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}>
          Abmelden
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '16px 20px 0' }}>
        <button
          onClick={() => setTab('termine')}
          className={`payment-method-btn${tab === 'termine' ? ' payment-method-btn--selected' : ''}`}
          style={{ flex: 1 }}
        >
          Termine
        </button>
        <button
          onClick={() => setTab('umsatz')}
          className={`payment-method-btn${tab === 'umsatz' ? ' payment-method-btn--selected' : ''}`}
          style={{ flex: 1 }}
        >
          Umsatz
        </button>
      </div>

      <div style={{ padding: 20 }}>{tab === 'termine' ? <TermineTab artistId={artist.id} locationId={artist.location_id} /> : <UmsatzTab artist={artist} />}</div>
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
