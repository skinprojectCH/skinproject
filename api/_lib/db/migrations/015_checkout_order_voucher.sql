-- checkout_order: unterstützt jetzt Gutschein-Zahlungen. Jedes Element in p_payments
-- kann optional ein "voucher_id" Feld enthalten. Ist es gesetzt, wird der Restwert des
-- Gutscheins innerhalb derselben Transaktion geprüft und reduziert (verhindert doppelte
-- Einlösung / Überziehen bei gleichzeitigen Anfragen dank "for update"-Sperre).
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
  v_voucher_id uuid;
  v_amount numeric;
  v_remaining numeric;
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
    v_voucher_id := nullif(v_payment->>'voucher_id', '')::uuid;
    v_amount := (v_payment->>'amount')::numeric;

    if v_voucher_id is not null then
      select remaining_value into v_remaining from vouchers where id = v_voucher_id for update;
      if v_remaining is null then
        raise exception 'Gutschein nicht gefunden';
      end if;
      if v_remaining < v_amount then
        raise exception 'Gutschein-Guthaben reicht nicht aus (verfügbar: CHF %)', v_remaining;
      end if;
      update vouchers
        set remaining_value = remaining_value - v_amount,
            status = case when (remaining_value - v_amount) <= 0 then 'eingelöst' else status end
        where id = v_voucher_id;
    end if;

    insert into payments (order_id, method, amount, voucher_id)
    values (v_order_id, v_payment->>'method', v_amount, v_voucher_id);
  end loop;

  if p_appointment_id is not null then
    update appointments set status = 'kassiert' where id = p_appointment_id;
  end if;

  return v_order_id;
end;
$$;

grant execute on function checkout_order to authenticated;
