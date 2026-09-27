-- 040: Admin kann einen bereits kassierten Termin KOMPLETT löschen.
-- Atomar in einer Transaktion:
--   1. Mit Gutschein/Anzahlung bezahlte Beträge werden dem Gutschein wieder gutgeschrieben
--   2. Order(s) des Termins werden gelöscht (order_line_items + payments per CASCADE)
--   3. Termin wird gelöscht (appointment_line_items per CASCADE,
--      customer_documents.appointment_id -> NULL gemäss Migration 039)
-- Danach ist der Betrag aus Umsatz, Artist-Abrechnung, Kassenbestand und Statistik weg.
-- Nur Rolle 'admin' -- auch serverseitig geprüft, Manager werden abgewiesen.

create or replace function admin_delete_appointment_full(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment record;
begin
  if app_role() is distinct from 'admin' then
    raise exception 'Nur Admins dürfen kassierte Termine löschen';
  end if;

  for v_payment in
    select p.voucher_id, p.amount
      from payments p
      join orders o on o.id = p.order_id
     where o.appointment_id = p_appointment_id
       and p.voucher_id is not null
  loop
    update vouchers
       set remaining_value = remaining_value + v_payment.amount,
           status = case when status = 'eingelöst' then 'aktiv' else status end
     where id = v_payment.voucher_id;
  end loop;

  delete from orders where appointment_id = p_appointment_id;
  delete from appointments where id = p_appointment_id;
end;
$$;

grant execute on function admin_delete_appointment_full(uuid) to authenticated;
