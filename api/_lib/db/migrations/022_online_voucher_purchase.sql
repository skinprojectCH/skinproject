-- Haupt-Location: dort wird der Umsatz von Verkäufen ohne eigene Location-Zuordnung
-- gutgeschrieben (aktuell nur online verkaufte Gutscheine, die an jeder Location
-- eingelöst werden können). Nur eine Location darf gleichzeitig "Haupt" sein.
alter table locations add column if not exists is_main boolean not null default false;
create unique index if not exists locations_single_main_idx on locations ((is_main)) where is_main;

-- Gutschein-Herkunft: Kasse vor Ort vs. Online-Kauf via Stripe, plus optionale
-- Käufer-Kontaktdaten (bei Online-Käufen ohne Kundenprofil) und die Stripe-Session-ID
-- zur eindeutigen Zuordnung/Vermeidung von Doppel-Buchungen durch den Webhook.
alter table vouchers add column if not exists source text not null default 'kasse' check (source in ('kasse','online'));
alter table vouchers add column if not exists buyer_email text;
alter table vouchers add column if not exists buyer_name text;
alter table vouchers add column if not exists stripe_session_id text unique;

-- Zahlungsart "online" (Stripe) zulassen
alter table payments drop constraint if exists payments_method_check;
alter table payments add constraint payments_method_check
  check (method in ('karte', 'bar', 'gutschein', 'rechnung', 'online'));
