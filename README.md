# Handoff: 2ndSkin — Tattoo-Studio Software (Design)

## Overview
Complete UI design for 2ndSkin, a booking/POS/admin platform for a tattoo studio. Covers three surfaces:
1. **Desktop Admin/Salon** — calendar, checkout (Kasse), customers, and admin (artists, services, products, shifts, absences, stats, locations, vouchers).
2. **Artist PWA (mobile)** — agenda, booking, payouts, profile.
3. **Customer PWA (mobile)** — new-customer onboarding flow triggered via QR code at the studio.

## About the Design Files
The files in this bundle (`2ndSkin Design.dc.html`, `Sidebar.dc.html`) are **design references built in HTML** — they show the intended look, structure, and copy, not production code to copy directly. The task is to **recreate these designs in the target codebase's actual environment** (React, Vue, native mobile, etc.) using that codebase's existing component library, routing, and state-management patterns. If no environment/design-system exists yet in the target repo, pick the most suitable stack and implement fresh — but keep the visual system (tokens below) intact.

`Sidebar.dc.html` is a small reusable snippet demonstrating the desktop nav component contract (props: `active` screen key, `adminSub` sub-item key) — reproduce it as a real nav component with the same active/inactive states rather than importing the file.

## Fidelity
**High-fidelity.** Colors, type, spacing, icon style, and copy are final-direction (not placeholder). Some data (names, prices, dates) is sample/demo content — treat labels/structure as real, values as illustrative.

## Design Tokens

**Colors**
- `#111111` — Primary (text, nav background, primary buttons)
- `#FFFFFF` — Surface / cards
- `#B08D3D` (Gold) — Accent: active states, links, selected items, price/status highlights
- `#EFEEEA` — Page background / light neutral fill
- `#F7F1E3` — Gold-tinted light fill (e.g. selected calendar slots, info callouts)
- `#FBF6EA` / `#E8D9B0` — Warm callout background/border (health notices, warnings)
- `#8B5A5A` (Bordeaux) — Destructive actions, cancelled/error states, one of the artist-color set
- `#7A8A99` (Slate) — Secondary artist color, neutral info accents
- `#6B5B45` (Taupe) — Additional artist color slot
- Borders: `#ddd` default, `#eee` for subtle dividers inside cards

**Artist color-coding** (used consistently across calendar, shift plan, stats): Nina = Gold `#B08D3D`, Tom = Slate `#7A8A99`, Elif = Bordeaux `#8B5A5A`, further artists = Taupe `#6B5B45` and similar muted hues. Each artist keeps one color across every screen (calendar events, avatars, admin lists).

**Typography**
- Headings: **Space Grotesk** (weights 500/700) — page titles (24–34px/700), card/section titles (16–19px/700), modal titles (17–19px/700).
- Body/UI: **Work Sans** (weights 400/500/600, italic 400) — body text 12–13px/400, buttons 12–14px/600, labels 10–11px uppercase/600 with ~0.5px letter-spacing, color `#999`.
- Load via Google Fonts: `family=Space+Grotesk:wght@500;700&family=Work+Sans:ital,wght@0,400;0,500;0,600;1,400`.

**Radius / Shape**
- Cards/panels: 6px. Buttons/inputs: 4px (desktop), 8px (mobile). Mobile phone frame: 28px. Pills/status badges: 10px (desktop), 12px (mobile toggle).

**Icons**
- Line icons only, 2px stroke (1.6px in the icon-concept board), `currentColor`, typically 13–14px inline / 22px standalone. No filled icons, no emoji in the shipped UI (emoji only appeared in early low-fi wireframes and were removed).

**Buttons**
- Primary: `#111` bg, white text, 600 weight.
- Accent: gold border/text (`#B08D3D`) for secondary-but-important actions (e.g. "+ Rabatt", links, "Kopieren").
- Secondary: `#ddd` border, dark text.
- Destructive: `#8B5A5A` border/text.

## Screens

### Desktop — Admin/Salon (1180px design width, sidebar 200px + content)
Every desktop screen shares a **left sidebar** (dark `#111` background, 200px, top-level items: Kalender / Kasse / Kunden / Admin). When "Admin" is active, it expands into a sub-nav: Artists, Dienstleistungen, Produkte, Schichtplan, Absenzen, Statistiken, Abrechnung, Locations, Gutscheine (gold highlight = active leaf).

- **D1 Login** — centered card, email/password fields, primary "Anmelden" button, gold "Passwort vergessen?" link.
- **D2/D3/D3b Kalender** (Tag/Liste/Woche) — day grid with per-artist columns, color-coded appointment chips (gold-tinted bg + colored left border matching the artist), "Ausserhalb Schicht" diagonal-hatch cells for non-working hours, darker chip shade + checkmark = paid/kassiert. List view is a plain table with status pills (gold=kassiert, bordeaux=storniert).
- **D17/D17b/D17c Termin buchen/bearbeiten/Absenz** — modal over blurred calendar background. Tabs for Termin vs Absenz. Service line items removable, running total/duration footer. Absenz modal has Ferien/Krank/Abwesend segmented control + half-day AM/PM toggle switch (gold).
- **D15/D15b/D15c Kasse** (checkout) — line-item cart (services + articles with qty steppers), per-line "+ Rabatt" affordance opening a discount popup (existing capability — see below), payment-method grid, "Kassieren" primary CTA, secondary "Nicht erschienen/Löschen" actions.
- **D18 Kassieren — Split Payment & Discount** — modal: subtotal → discount block (%/CHF toggle + apply) → total → multiple payment-method rows (card/cash/voucher, each removable) → paid-vs-total reconciliation banner (green "vollständig gedeckt").
- **D20b Gutschein erstellen** — modal: auto-generated code (+ regenerate), value, optional buyer lookup.
- **D4 Abrechnung** — KPI card row (revenue, artist revenue, appointments, avg ticket) + per-artist payout table.
- **D5/D6 Kunden** — list (search + table) and detail (two-column: editable fields/notes/docs/photos on the left, health-notice callout + appointment history with per-visit doc/photo counts on the right).
- **D7/D8 Artists** — list with color swatch + status pill; detail with profile fields, revenue-share %, service assignment (chip multi-select), PWA deep-link + QR code, calendar-color picker.
- **D9 family (Dienstleistungen)** — category sidebar + service table; D9b edit modal; D9c/D9d category create/edit modals.
- **D10 family (Produkte)** — same pattern as D9 but for retail articles (has barcode field in edit modal).
- **D11 Schichtplan** — per-weekday multi-timeslot editor ("+ Zeitfenster"), "Wochenplan übernehmen" action.
- **D12/D12b Absenzen** — table + create modal (same Ferien/Krank/Abwesend + half-day pattern as D17c).
- **D13 Statistiken** — three export cards (Artisten/Locations/MWST) each with date-range pickers and a PDF export CTA.
- **D14 Locations** — location list + detail form, VAT block, and a **repeatable Location-Manager section**: each manager is its own card (name/vorname/email/telefon) with a delete icon, plus a "+ Manager hinzufügen" action to add more.
- **D20 Gutscheine** — KPI cards + voucher table (code/buyer/value/remaining/status).
- **D16/D19 Quittung** — D16 is the in-app receipt summary (salon vs. artist breakdown); D19 is the printable customer-facing receipt with full VAT/revenue-share breakdown and payment split.

### Mobile — Artist PWA (340px phone frame, 28px corner radius, bottom tab bar: Agenda/Buchen/Abschlüsse/Profil, active tab in gold)
- **M1 Login**, **M2 Agenda** (day list of colored appointment cards), **M2b** (bottom sheet with Termin bearbeiten/löschen), **M5 Buchen** (new-appointment form, same pattern as D17 but mobile), **M6 Abschlüsse** (own payout total + today's appointments + PDF export), **M7 Profil** (editable fields + read-only revenue-share card).

### Mobile — Customer PWA / Onboarding (340px phone frame, no tab bar — linear wizard, reached via QR code at the studio)
Flow: **N1 Willkommen** (logo, checklist of steps, location callout, **phone-number field to detect existing customers**, "Weiter") → **N2 Kundendaten** (contact form + Tattoo/Piercing interest toggle) → **N3 Geburtsdatum** (age-gate notice) → **N4 Ausweis fotografieren** (dark camera-viewfinder mock with gold frame guide) → **N5 Gesundheitsfragebogen** (Ja/Nein toggle list, several with conditional detail fields) → **N6 Digitale Unterschrift** (signature pad) → **N7 Einverständnis** (checkbox + link to full text) → **N7b** (full consent text, back button) → **N8 Fertig** (gold checkmark confirmation).
Note: an earlier "Selfie mit Elternteil" step (for minors) was removed from the flow per latest direction — do not reintroduce it.

## Interactions & Behavior
- All modals follow the same pattern: page content blurred/dimmed behind (`filter: blur(1.5px); opacity: 0.5` + `rgba(17,17,17,0.35)` overlay), centered white card, header with title + ✕ close, footer with secondary "Abbrechen" + primary action button.
- Per-line-item and order-level discounts are both supported in Kasse: a line can carry its own %/CHF discount (shown as strikethrough original price + reduced price + small badge), and D18's checkout modal also supports one order-level discount on top.
- Half-day absence toggle (AM/PM) is a small pill switch, gold when on.
- Table rows with a trailing edit icon are click-to-edit (row opens the corresponding edit modal).
- Category/side-list items use a persistent-selection pattern: selected item gets solid `#111` bg, others plain text list.

## Assets
- Logo: circular avatar `uploads/2ndskin.webp`, used on login/welcome/receipt screens only (removed from the sidebar nav per latest direction — sidebar has no logo/wordmark).
- No other custom imagery; all "photo" areas (ID capture, camera viewfinder, customer photo grid) are placeholder blocks — replace with real camera/upload components.

## Files in this bundle
- `2ndSkin Design.dc.html` — the full design, all screens, single file (self-contained styling, inline).
- `Sidebar.dc.html` — the desktop nav pattern as a standalone reference (props: `active`, `adminSub`).
