-- Kategorien brauchen einen eigenen Aktiv/Inaktiv-Status,
-- damit man eine Kategorie deaktivieren kann (mit Kaskade auf ihre Services),
-- ohne sie löschen zu müssen.
alter table service_categories add column if not exists active boolean not null default true;
