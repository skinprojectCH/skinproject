# SkinProject

Booking/POS/Admin-Plattform für ein Tattoo-Studio. Desktop Admin/Salon-Teil (React + TypeScript + Vite + Supabase).

## Setup

1. `npm install`
2. `cp .env.example .env` und Supabase-URL + Anon-Key eintragen
3. `db/schema.sql` im Supabase SQL-Editor ausführen
4. `npm run dev`

## Struktur

- `src/pages` — Screens (Kalender, Kasse, Kunden, Admin-Unterseiten)
- `src/components` — Sidebar, Layout, wiederverwendbare UI
- `src/styles/tokens.css` — Design-System (Farben, Typo, Radius)
- `src/lib/supabaseClient.ts` — Supabase-Verbindung
- `db/schema.sql` — DB-Schema

## Design-Referenz

Ursprüngliches High-Fidelity-Design (Claude Design Handoff) liegt separat vor — Farben, Radius und Typografie sind bereits in `src/styles/tokens.css` übernommen.
