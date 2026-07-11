import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchCustomer,
  updateCustomer,
  deleteCustomer,
  fetchCustomerDocuments,
  uploadCustomerFile,
  getCustomerFileUrl,
  deleteCustomerDocument,
  fetchAppointmentsForCustomer,
  type Customer,
  type CustomerDocument,
} from '../lib/queries';
import { normalizePhone, formatCHF } from '../lib/format';

const inputStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  gebucht: { label: 'gebucht', color: '#777' },
  kassiert: { label: 'kassiert', color: 'var(--color-accent)' },
  storniert: { label: 'storniert', color: 'var(--color-destructive)' },
  nicht_erschienen: { label: 'nicht erschienen', color: 'var(--color-destructive)' },
};

export default function KundeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointmentHistory, setAppointmentHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [vorname, setVorname] = useState('');
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [strasse, setStrasse] = useState('');
  const [plzOrt, setPlzOrt] = useState('');
  const [notes, setNotes] = useState('');

  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [photos, setPhotos] = useState<CustomerDocument[]>([]);
  const [appointmentDocs, setAppointmentDocs] = useState<CustomerDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const apptDocInputRef = useRef<HTMLInputElement>(null);
  const apptPhotoInputRef = useRef<HTMLInputElement>(null);
  const [activeApptId, setActiveApptId] = useState<string | null>(null);
  const [expandedApptId, setExpandedApptId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function reloadDocs() {
    if (!id) return;
    setDocsLoading(true);
    fetchCustomerDocuments(id)
      .then((docs) => {
        setDocuments(docs.filter((d) => d.type === 'document' && !d.appointment_id));
        setPhotos(docs.filter((d) => d.type === 'photo' && !d.appointment_id));
        setAppointmentDocs(docs.filter((d) => !!d.appointment_id));
      })
      .catch((e) => setFileError(e.message))
      .finally(() => setDocsLoading(false));
  }

  useEffect(() => {
    if (!id) return;
    fetchCustomer(id)
      .then((c) => {
        setCustomer(c);
        setVorname(c.vorname);
        setName(c.name);
        setBirthdate(c.birthdate || '');
        setPhone(c.phone || '');
        setEmail(c.email || '');
        setStrasse(c.strasse || '');
        setPlzOrt(c.plz_ort || '');
        setNotes(c.notes || '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    reloadDocs();
    setHistoryLoading(true);
    fetchAppointmentsForCustomer(id)
      .then(setAppointmentHistory)
      .catch((e) => setError((prev) => prev || e.message))
      .finally(() => setHistoryLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const vornameValid = vorname.trim().length > 0;
  const nameValid = name.trim().length > 0;
  const canSave = vornameValid && nameValid;

  const docsByAppointment = useMemo(() => {
    const map: Record<string, CustomerDocument[]> = {};
    for (const doc of appointmentDocs) {
      if (!doc.appointment_id) continue;
      (map[doc.appointment_id] ||= []).push(doc);
    }
    return map;
  }, [appointmentDocs]);

  const totalRevenue = useMemo(() => {
    return appointmentHistory.reduce((sum, appt: any) => {
      const order = appt.orders?.[0];
      return order && order.status === 'bezahlt' ? sum + Number(order.total) : sum;
    }, 0);
  }, [appointmentHistory]);

  function handlePhoneBlur() {
    if (phone.trim()) setPhone(normalizePhone(phone));
  }

  async function handleSave() {
    setAttempted(true);
    if (!canSave || !id) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await updateCustomer(id, {
        vorname: vorname.trim(),
        name: name.trim(),
        birthdate: birthdate || null,
        phone: phone.trim() ? normalizePhone(phone) : null,
        email: email.trim() || null,
        strasse: strasse.trim() || null,
        plz_ort: plzOrt.trim() || null,
        notes: notes.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    setSaveError(null);
    try {
      await deleteCustomer(id);
      navigate('/kunden');
    } catch (e: any) {
      setSaveError(
        e.message?.includes('foreign key')
          ? 'Dieser Kunde hat bereits Termine/Bestellungen und kann nicht gelöscht werden.'
          : e.message
      );
      setDeleting(false);
    }
  }

  async function handleFileSelected(file: File | undefined, type: 'document' | 'photo', appointmentId?: string | null) {
    if (!file || !id) return;
    setFileError(null);
    type === 'document' ? setUploadingDoc(true) : setUploadingPhoto(true);
    try {
      await uploadCustomerFile(id, file, type, appointmentId ?? null);
      reloadDocs();
    } catch (e: any) {
      setFileError(e.message);
    } finally {
      setUploadingDoc(false);
      setUploadingPhoto(false);
    }
  }

  function triggerApptUpload(appointmentId: string, type: 'document' | 'photo') {
    setActiveApptId(appointmentId);
    if (type === 'document') apptDocInputRef.current?.click();
    else apptPhotoInputRef.current?.click();
  }

  async function handleOpenFile(doc: CustomerDocument) {
    try {
      const url = await getCustomerFileUrl(doc.storage_path);
      window.open(url, '_blank');
    } catch (e: any) {
      setFileError(e.message);
    }
  }

  async function handleDeleteFile(doc: CustomerDocument) {
    try {
      await deleteCustomerDocument(doc);
      reloadDocs();
    } catch (e: any) {
      setFileError(e.message);
    }
  }

  if (loading) return <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>;
  if (error) return <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>;
  if (!customer) return <div style={{ fontSize: 13, color: '#999' }}>Kunde nicht gefunden.</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 28 }}>
        <div style={{ width: 340, flexShrink: 0 }}>
          <h2 style={{ fontSize: 19, marginBottom: 16 }}>Kunde bearbeiten</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 6 }}>
            <div>
              <div className="label-uppercase" style={{ marginBottom: 4 }}>
                Name
              </div>
              <input value={name} onChange={(e) => setName(e.target.value)} style={attempted && !nameValid ? { ...inputStyle, border: '1px solid var(--color-destructive)' } : inputStyle} />
            </div>
            <div>
              <div className="label-uppercase" style={{ marginBottom: 4 }}>
                Vorname
              </div>
              <input value={vorname} onChange={(e) => setVorname(e.target.value)} style={attempted && !vornameValid ? { ...inputStyle, border: '1px solid var(--color-destructive)' } : inputStyle} />
            </div>
          </div>
          {attempted && (!nameValid || !vornameValid) && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginBottom: 8 }}>Name und Vorname sind Pflichtfelder.</div>}

          <div style={{ margin: '14px 0 6px' }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              Geburtsdatum
            </div>
            <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ margin: '14px 0 6px' }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              Mobile
            </div>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={handlePhoneBlur} style={inputStyle} placeholder="+41791234567" />
          </div>

          <div style={{ margin: '14px 0 20px' }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              E-Mail
            </div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="—" />
          </div>

          <div style={{ margin: '14px 0 6px' }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              Strasse
            </div>
            <input value={strasse} onChange={(e) => setStrasse(e.target.value)} style={inputStyle} placeholder="—" />
          </div>

          <div style={{ margin: '14px 0 20px' }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              PLZ / Ort
            </div>
            <input value={plzOrt} onChange={(e) => setPlzOrt(e.target.value)} style={inputStyle} placeholder="—" />
          </div>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 20, background: 'var(--color-surface)' }}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ ...inputStyle, minHeight: 60 }}
              placeholder="z.B. bevorzugte Termine, Hautempfindlichkeit…"
            />
          </div>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 20, background: 'var(--color-surface)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Dokumente</div>
            {docsLoading ? (
              <div style={{ fontSize: 12, color: '#999' }}>Lädt…</div>
            ) : documents.length === 0 ? (
              <div style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>Noch keine Dokumente hochgeladen.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {documents.map((doc) => (
                  <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 4, padding: '8px 10px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.storage_path.split('/').pop()}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <div onClick={() => handleOpenFile(doc)} style={{ color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
                        Öffnen
                      </div>
                      <div onClick={() => handleDeleteFile(doc)} style={{ color: '#999', cursor: 'pointer' }}>
                        ✕
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <input ref={docInputRef} type="file" style={{ display: 'none' }} onChange={(e) => handleFileSelected(e.target.files?.[0], 'document')} />
            <div onClick={() => docInputRef.current?.click()} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
              {uploadingDoc ? 'Lädt hoch…' : '+ Dokument hochladen'}
            </div>
          </div>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 20, background: 'var(--color-surface)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Fotos</div>
            {photos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
                {photos.map((p) => (
                  <div key={p.id} onClick={() => handleOpenFile(p)} style={{ position: 'relative', cursor: 'pointer' }}>
                    <div style={{ aspectRatio: '1', background: '#EFEEEA', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#999', overflow: 'hidden' }}>
                      Foto
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(p);
                      }}
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      ✕
                    </div>
                  </div>
                ))}
              </div>
            )}
            {photos.length === 0 && !docsLoading && <div style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>Noch keine Fotos.</div>}
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileSelected(e.target.files?.[0], 'photo')} />
            <div onClick={() => photoInputRef.current?.click()} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
              {uploadingPhoto ? 'Lädt hoch…' : '+ Foto hochladen'}
            </div>
          </div>

          {fileError && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{fileError}</div>}
          {saveError && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{saveError}</div>}
          {saved && <div style={{ fontSize: 12, color: '#1a7a3f', marginBottom: 12 }}>✓ Gespeichert.</div>}

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 10, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
            {saving ? 'Speichert…' : 'Speichern'}
          </button>

          {!confirmDelete ? (
            <button className="btn btn-destructive" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setConfirmDelete(true)}>
              Kunde löschen
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmDelete(false)}>
                Doch nicht
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
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {customer.health_notice && (
            <div style={{ border: '1px solid var(--color-warn-border)', background: 'var(--color-warn-bg)', borderRadius: 6, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8A6D2E', fontWeight: 700, marginBottom: 6 }}>
                Gesundheitshinweise (aus Anmeldeformular)
              </div>
              <div style={{ fontSize: 12, color: '#5a4a20', lineHeight: 1.6 }}>{customer.health_notice}</div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <h3 style={{ fontSize: 16 }}>Vergangene Termine</h3>
            {appointmentHistory.length > 0 && (
              <div style={{ fontSize: 12, color: '#999' }}>
                Gesamtumsatz Kunde: <strong style={{ color: 'var(--color-primary)' }}>{formatCHF(totalRevenue)}</strong>
              </div>
            )}
          </div>
          {historyLoading ? (
            <div style={{ fontSize: 12, color: '#999' }}>Lädt…</div>
          ) : appointmentHistory.length === 0 ? (
            <div style={{ fontSize: 12, color: '#999' }}>Noch keine Termine für diesen Kunden erfasst.</div>
          ) : (
            <div style={{ marginTop: 10 }}>
              {appointmentHistory.map((appt: any) => {
                const statusInfo = STATUS_LABELS[appt.status] || STATUS_LABELS.gebucht;
                const services = (appt.appointment_line_items || []).map((li: any) => li.services?.name).filter(Boolean);
                const order = appt.orders?.[0];
                const showStatusBadge = appt.status === 'storniert' || appt.status === 'nicht_erschienen';
                const apptFiles = docsByAppointment[appt.id] || [];
                const apptDocs = apptFiles.filter((d) => d.type === 'document');
                const apptPhotos = apptFiles.filter((d) => d.type === 'photo');
                const isExpanded = expandedApptId === appt.id;
                return (
                  <div key={appt.id} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '14px 16px', marginBottom: 12, background: 'var(--color-surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>
                        {new Date(appt.start_time).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        {' · '}
                        {services.length > 0 ? services.join(', ') : appt.type === 'absenz' ? 'Absenz' : 'Termin'}
                        {' · '}
                        {appt.artists?.name || '—'}
                      </div>
                      {showStatusBadge ? (
                        <div
                          style={{
                            border: `1px solid ${statusInfo.color}`,
                            color: statusInfo.color,
                            borderRadius: 10,
                            padding: '2px 10px',
                            fontSize: 10,
                            fontWeight: 600,
                            flexShrink: 0,
                            textTransform: 'uppercase',
                          }}
                        >
                          {appt.status === 'storniert' ? 'Absage' : statusInfo.label}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{order ? formatCHF(order.total) : '—'}</div>
                      )}
                    </div>

                    {appt.notes && <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>Notiz: {appt.notes}</div>}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      {apptDocs.length > 0 && (
                        <div
                          onClick={() => setExpandedApptId(isExpanded ? null : appt.id)}
                          style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: '3px 10px', fontSize: 11, color: '#777', cursor: 'pointer' }}
                        >
                          {apptDocs.length} {apptDocs.length === 1 ? 'Dokument' : 'Dokumente'}
                        </div>
                      )}
                      {apptPhotos.length > 0 && (
                        <div
                          onClick={() => setExpandedApptId(isExpanded ? null : appt.id)}
                          style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: '3px 10px', fontSize: 11, color: '#777', cursor: 'pointer' }}
                        >
                          {apptPhotos.length} {apptPhotos.length === 1 ? 'Foto' : 'Fotos'}
                        </div>
                      )}
                      <div onClick={() => triggerApptUpload(appt.id, 'document')} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
                        + Dokument
                      </div>
                      <div onClick={() => triggerApptUpload(appt.id, 'photo')} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
                        + Foto
                      </div>
                    </div>

                    {isExpanded && apptFiles.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                        {apptFiles.map((doc) => (
                          <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 4, padding: '6px 10px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.storage_path.split('/').pop()}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                              <div onClick={() => handleOpenFile(doc)} style={{ color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
                                Öffnen
                              </div>
                              <div onClick={() => handleDeleteFile(doc)} style={{ color: '#999', cursor: 'pointer' }}>
                                ✕
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <input
            ref={apptDocInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={(e) => {
              handleFileSelected(e.target.files?.[0], 'document', activeApptId);
              e.target.value = '';
            }}
          />
          <input
            ref={apptPhotoInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              handleFileSelected(e.target.files?.[0], 'photo', activeApptId);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </div>
  );
}
