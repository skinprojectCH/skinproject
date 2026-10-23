-- Halloween-Piercing-Special (CHF 31.--, verkauft bis 1.11.2026 23:59, danach jederzeit
-- einlösbar für EIN Piercing inkl. Titanschmuck -- unabhängig vom sonstigen Listenpreis
-- des gewählten Piercings). Das bestehende Gutschein-Modell ist ein reiner Betrags-
-- Gutschein (remaining_value wird beim Einlösen um den eingesetzten Betrag reduziert und
-- deckelt, wie viel pro Zahlung maximal eingesetzt werden darf) -- das passt nicht zu
-- einem Fixpreis-Ticket, das einmalig den vollen Posten abdecken soll, egal was der
-- Posten effektiv kostet.
--
-- deal_full_coverage = true markiert genau diesen Spezialfall: beim Einlösen wird die
-- normale remaining_value-Deckelung übersprungen und der Gutschein nach der ersten
-- Verwendung komplett verbraucht (remaining_value = 0, status = 'eingelöst'), egal
-- welcher Betrag eingesetzt wurde. value/remaining_value bleiben beim Verkauf trotzdem
-- auf dem bezahlten Betrag (CHF 31) -- damit stimmen "Verkauft"/"Offener Restwert" in der
-- Gutscheine-Übersicht weiterhin.
--
-- campaign ist ein freies Tag zur Wiedererkennung (z.B. in der Gutscheine-Übersicht und
-- beim Kassieren), unabhängig von deal_full_coverage wiederverwendbar für künftige Aktionen.
alter table vouchers add column if not exists deal_full_coverage boolean not null default false;
alter table vouchers add column if not exists campaign text;

create or replace function checkout_order(
  p_appointment_id uuid,
  p_customer_id uuid,
  p_location_id uuid,
  p_subtotal numeric,
  p_discount_type text,
  p_discount_value numeric,
  p_total numeric,
  p_line_items jsonb,
  p_payments jsonb,
  p_vouchers jsonb default '[]'::jsonb
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_payment jsonb;
  v_voucher jsonb;
  v_voucher_id uuid;
  v_amount numeric;
  v_remaining numeric;
  v_product_only boolean;
  v_expires_at timestamptz;
  v_deal_full_coverage boolean;
  v_product_total numeric;
  v_product_only_redeemed numeric := 0;
begin
  insert into orders (appointment_id, customer_id, location_id, subtotal, order_discount_type, order_discount_value, total, status)
  values (p_appointment_id, p_customer_id, p_location_id, p_subtotal, p_discount_type, p_discount_value, p_total, 'bezahlt')
  returning id into v_order_id;

  v_product_total := 0;
  for v_item in select * from jsonb_array_elements(p_line_items)
  loop
    insert into order_line_items (order_id, service_id, product_id, description, quantity, unit_price, discount_type, discount_value, line_total)
    values (
      v_order_id,
      nullif(v_item->>'service_id', '')::uuid,
      nullif(v_item->>'product_id', '')::uuid,
      v_item->>'description',
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::numeric,
      nullif(v_item->>'discount_type', ''),
      nullif(v_item->>'discount_value', '')::numeric,
      (v_item->>'line_total')::numeric
    );
    if nullif(v_item->>'product_id', '') is not null then
      v_product_total := v_product_total + (v_item->>'line_total')::numeric;
    end if;
  end loop;

  -- Neue Gutscheine, die in diesem Verkauf ausgestellt werden.
  for v_voucher in select * from jsonb_array_elements(p_vouchers)
  loop
    insert into vouchers (code, value, remaining_value, buyer_customer_id, status)
    values (
      v_voucher->>'code',
      (v_voucher->>'value')::numeric,
      (v_voucher->>'value')::numeric,
      nullif(v_voucher->>'buyer_customer_id', '')::uuid,
      'aktiv'
    );
  end loop;

  for v_payment in select * from jsonb_array_elements(p_payments)
  loop
    v_voucher_id := nullif(v_payment->>'voucher_id', '')::uuid;
    v_amount := (v_payment->>'amount')::numeric;

    if v_voucher_id is not null then
      select remaining_value, product_only, expires_at, deal_full_coverage into v_remaining, v_product_only, v_expires_at, v_deal_full_coverage
        from vouchers where id = v_voucher_id for update;
      if v_remaining is null then
        raise exception 'Gutschein nicht gefunden';
      end if;
      if v_expires_at is not null and v_expires_at < now() then
        raise exception 'Gutschein ist abgelaufen';
      end if;

      if v_deal_full_coverage then
        -- Ticket-Gutschein (z.B. Halloween-Special): keine Restwert-Deckelung, deckt den
        -- eingesetzten Betrag in jedem Fall vollständig ab und wird in einem Zug komplett
        -- verbraucht. Darf nur einmal eingesetzt werden (remaining_value > 0 = noch frei).
        if v_remaining <= 0 then
          raise exception 'Dieser Gutschein wurde bereits eingelöst';
        end if;
        update vouchers set remaining_value = 0, status = 'eingelöst' where id = v_voucher_id;
      else
        if v_remaining < v_amount then
          raise exception 'Gutschein-Guthaben reicht nicht aus (verfügbar: CHF %)', v_remaining;
        end if;
        if v_product_only then
          v_product_only_redeemed := v_product_only_redeemed + v_amount;
          if v_product_only_redeemed > v_product_total then
            raise exception 'Dieser Gutschein ist nur für Produkte einlösbar (verfügbarer Produktbetrag: CHF %)', v_product_total;
          end if;
        end if;
        update vouchers
          set remaining_value = remaining_value - v_amount,
              status = case when (remaining_value - v_amount) <= 0 then 'eingelöst' else status end
          where id = v_voucher_id;
      end if;
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
