-- checkout_order um p_location_id erweitern, damit jede Order zwingend einem
-- Standort zugeordnet ist (Grundlage für Umsatz-/Abrechnungsauswertung pro Location).
-- Die Parameter-Signatur ändert sich (neuer Parameter mittendrin) — die alte Version
-- muss darum zuerst explizit gelöscht werden, sonst entsteht eine zweite, überladene
-- Funktion statt eines Ersatzes.
drop function if exists checkout_order(uuid, uuid, numeric, text, numeric, numeric, jsonb, jsonb);

create or replace function checkout_order(
  p_appointment_id uuid,
  p_customer_id uuid,
  p_location_id uuid,
  p_subtotal numeric,
  p_discount_type text,
  p_discount_value numeric,
  p_total numeric,
  p_line_items jsonb,
  p_payments jsonb
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_payment jsonb;
begin
  insert into orders (appointment_id, customer_id, location_id, subtotal, order_discount_type, order_discount_value, total, status)
  values (p_appointment_id, p_customer_id, p_location_id, p_subtotal, p_discount_type, p_discount_value, p_total, 'bezahlt')
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_line_items)
  loop
    insert into order_line_items (order_id, service_id, product_id, description, quantity, unit_price, line_total)
    values (
      v_order_id,
      nullif(v_item->>'service_id', '')::uuid,
      nullif(v_item->>'product_id', '')::uuid,
      v_item->>'description',
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::numeric,
      (v_item->>'line_total')::numeric
    );
  end loop;

  for v_payment in select * from jsonb_array_elements(p_payments)
  loop
    insert into payments (order_id, method, amount)
    values (v_order_id, v_payment->>'method', (v_payment->>'amount')::numeric);
  end loop;

  if p_appointment_id is not null then
    update appointments set status = 'kassiert' where id = p_appointment_id;
  end if;

  return v_order_id;
end;
$$;

grant execute on function checkout_order to authenticated;
