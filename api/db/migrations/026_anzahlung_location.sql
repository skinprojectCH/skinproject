-- Anzahlungen (Kunden-Guthaben) direkt der Location zuordnen, an der sie verkauft wurden --
-- notwendig, damit der aktuelle Bestand pro Standort korrekt berechnet werden kann.
alter table vouchers add column if not exists location_id uuid references locations(id);
