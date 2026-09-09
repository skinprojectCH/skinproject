-- Zwei neue Einwilligungs-Felder bei der Kunden-Registrierung (WhatsApp-Kontakt, Werbung).
-- Der admin-editierbare Einverständniserklärung-Text braucht keine Schemaänderung -- er
-- landet einfach als neuer Key in der bestehenden Key-Value-Tabelle "app_settings".
alter table customers add column if not exists whatsapp_opt_in boolean not null default false;
alter table customers add column if not exists werbung_opt_in boolean not null default false;
