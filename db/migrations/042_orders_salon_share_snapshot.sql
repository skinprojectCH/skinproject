-- 042: Salon-Anteil (Miet- & Serviceanteil in %) pro Bestellung beim Kassieren festhalten.
-- Damit ändern spätere Anpassungen am Artist (z.B. wird ab 1.11. Mitarbeiter oder bekommt
-- einen anderen Prozentsatz) die Vergangenheit NICHT rückwirkend.
-- 100 = Mitarbeiter oder Verkauf ohne Artist (alles Salon).

alter table orders add column if not exists salon_share_pct numeric(5,2);

-- Bestehende Bestellungen mit den HEUTIGEN Einstellungen befüllen (einmalig).
update orders o
   set salon_share_pct = case when a.is_employee then 100 else coalesce(a.revenue_share_pct, 100) end
  from appointments ap
  join artists a on a.id = ap.artist_id
 where o.appointment_id = ap.id
   and o.salon_share_pct is null;

update orders set salon_share_pct = 100 where salon_share_pct is null;

-- Neue Bestellungen: automatisch beim Anlegen setzen (Kasse muss nichts mitschicken).
create or replace function set_order_salon_share() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.salon_share_pct is null then
    select case when a.is_employee then 100 else coalesce(a.revenue_share_pct, 100) end
      into new.salon_share_pct
      from appointments ap
      join artists a on a.id = ap.artist_id
     where ap.id = new.appointment_id;
    if new.salon_share_pct is null then
      new.salon_share_pct := 100;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_order_salon_share on orders;
create trigger trg_set_order_salon_share
  before insert on orders
  for each row execute function set_order_salon_share();
