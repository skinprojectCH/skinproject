-- Nachträglich: Beschreibungsfeld für Services (war im Design vorgesehen, fehlte im Schema)
alter table services add column if not exists description text;
