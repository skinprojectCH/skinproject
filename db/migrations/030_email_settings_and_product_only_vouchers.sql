-- Automatischer E-Mail-Versand (Pflegeanleitung nach Kasse-Checkout, Bestätigung
-- nach Online-Gutschein-/Anzahlungskauf): Grundlage dafür sind zentrale, vom
-- Hauptadmin editierbare Einstellungen (Pflegeanleitungstexte, Dankeschön-Gutschein)
-- plus die Möglichkeit, einen Gutschein auf "nur für Produkte einlösbar" und ein
-- Ablaufdatum zu beschränken.

-- Einfache Key/Value-Ablage für globale App-Einstellungen (nicht pro Location, da die
-- Pflegeanleitungen und der Dankeschön-Gutschein salonweit gelten).
create table if not exists app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table app_settings disable row level security;

-- Gutschein darf auf "nur für Produkte" beschränkt werden (z.B. der automatisch
-- verschickte Dankeschön-Gutschein nach der Behandlung) und ein Ablaufdatum bekommen.
alter table vouchers add column if not exists product_only boolean not null default false;
alter table vouchers add column if not exists expires_at timestamptz;

-- "system" als weitere Herkunft zulassen (automatisch generierte Gutscheine, die
-- weder an der Kasse noch online verkauft, sondern verschenkt wurden).
alter table vouchers drop constraint if exists vouchers_source_check;
alter table vouchers add constraint vouchers_source_check
  check (source in ('kasse', 'online', 'system'));

-- Merkt sich, ob für eine Order bereits eine Pflegeanleitungs-Mail verschickt wurde
-- (verhindert Doppelversand, falls die Kasse-Seite den Aufruf z.B. durch einen
-- Netzwerk-Retry zweimal auslöst).
alter table orders add column if not exists care_email_sent_at timestamptz;
