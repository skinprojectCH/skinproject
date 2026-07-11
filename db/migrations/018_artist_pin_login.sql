-- PIN-Login für die Artist-PWA. PIN wird gehasht (scrypt + Salt) gespeichert,
-- nie im Klartext. Das eigentliche Supabase-Auth-Konto dahinter nutzt ein
-- deterministisches, nie exponiertes Passwort (siehe api/create-artist-pin.ts
-- und api/artist-pin-login.ts) — der PIN ist die einzige Nutzer-sichtbare Hürde.
alter table artists add column if not exists pin_hash text;
alter table artists add column if not exists pin_salt text;
