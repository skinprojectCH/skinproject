import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchCustomer,
  updateCustomer,
  deleteCustomer,
  fetchCustomerDocuments,
  uploadCustomerFile,
  getCustomerFileUrl,
  deleteCustomerDocument,
  type Customer,
  type CustomerDocument,
} from '../lib/queries';

const inputStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' };

export default function KundeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vorname, setVorname] = useState('');
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [photos, setPhotos] = useState<CustomerDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

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
        setDocuments(docs.filter((d) => d.type === 'document'));
        setPhotos(docs.filter((d) => d.type === 'photo'));
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
        setNotes(c.notes || '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    reloadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const vornameValid = vorname.trim().length > 0;
  const nameValid = name.trim().length > 0;
  const canSave = vornameValid && nameValid;

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
        phone: phone.trim() || null,
        email: email.trim() || null,
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

  async function handleFileSelected(file: File | undefined, type: 'document' | 'photo') {
    if (!file || !id) return;
    setFileError(null);
    type === 'document' ? setUploadingDoc(true) : setUploadingPhoto(true);
    try {
      await uploadCustomerFile(id, file, type);
      reloadDocs();
    } catch (e: any) {
      setFileError(e.message);
    } finally {
      setUploadingDoc(false);
      setUploadingPhoto(false);
    }
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
            <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} placeholder="—" />
          </div>

          <div style={{ margin: '14px 0 20px' }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              E-Mail
            </div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="—" />
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Notizen</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ ...inputStyle, minHeight: 60 }}
              placeholder="z.B. bevorzugte Termine, Hautempfindlichkeit…"
            />
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Dokumente</div>
            {docsLoading ? (
              <div style={{ fontSize: 12, color: '#999' }}>Lädt…</div>
            ) : documents.length === 0 ? (
              <div style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>Noch keine Dokumente hochgeladen.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {documents.map((doc) => (
                  <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, border: '1px solid #eee', borderRadius: 4, padding: '8px 10px' }}>
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

          <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 14, marginBottom: 20 }}>
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

          <h3 style={{ fontSize: 16, marginBottom: 2 }}>Vergangene Termine</h3>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>Wird aus Terminen/Bestellungen geladen, sobald für diesen Kunden kassiert wurde.</div>
        </div>
      </div>
    </div>
  );
}
