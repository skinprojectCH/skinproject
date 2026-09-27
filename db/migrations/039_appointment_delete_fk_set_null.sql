-- 039: Termine löschbar machen, auch wenn Dokumente oder Orders daran hängen.
-- Dokumente (z.B. Einverständniserklärungen) und Orders bleiben erhalten,
-- nur die Verknüpfung zum gelöschten Termin wird auf NULL gesetzt.

alter table customer_documents
  drop constraint if exists customer_documents_appointment_id_fkey;
alter table customer_documents
  add constraint customer_documents_appointment_id_fkey
  foreign key (appointment_id) references appointments(id) on delete set null;

alter table orders
  drop constraint if exists orders_appointment_id_fkey;
alter table orders
  add constraint orders_appointment_id_fkey
  foreign key (appointment_id) references appointments(id) on delete set null;
