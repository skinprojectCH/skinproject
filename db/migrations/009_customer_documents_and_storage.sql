-- Bisher erlaubte customer_documents.type nur 'id_photo','signature','photo'.
-- Für frei hochgeladene Dokumente (z.B. unterschriebene PDFs) fehlt ein generischer Typ.
alter table customer_documents drop constraint if exists customer_documents_type_check;
alter table customer_documents add constraint customer_documents_type_check
  check (type in ('id_photo','signature','photo','document'));

-- Storage-Bucket für Kundendateien (Dokumente + Fotos). Privat, Zugriff nur über
-- signierte URLs bzw. RLS-Policies unten (kein öffentlicher Lesezugriff).
insert into storage.buckets (id, name, public)
values ('customer-files', 'customer-files', false)
on conflict (id) do nothing;

-- Eingeloggte Nutzer dürfen in diesem Bucket lesen/schreiben/löschen.
-- (Gleiche Grundlage wie die übrigen RLS-Policies: jeder eingeloggte Account = Staff.)
create policy "Eingeloggte Nutzer: Zugriff auf customer-files (select)"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'customer-files');

create policy "Eingeloggte Nutzer: Zugriff auf customer-files (insert)"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'customer-files');

create policy "Eingeloggte Nutzer: Zugriff auf customer-files (delete)"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'customer-files');
