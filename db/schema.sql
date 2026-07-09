-- ============================================================
-- SkinProject — DB Schema (Supabase / Postgres)
-- Abgeleitet aus den Design-Screens (D1-D20, M1-M7, N1-N8)
-- ============================================================

-- ---------- Locations ----------
create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  vat_number text,
  created_at timestamptz not null default now()
);

create table location_managers (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  vorname text not null,
  name text not null,
  email text,
  telefon text
);

-- ---------- Artists ----------
create table artists (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id),
  name text not null,
  email text,
  phone text,
  revenue_share_pct numeric(5,2) not null default 50.00,
  calendar_color text not null,        -- z.B. '#B08D3D'
  status text not null default 'active' check (status in ('active','inactive')),
  avatar_url text,
  pwa_link text,
  created_at timestamptz not null default now()
);

-- ---------- Auth / Users ----------
-- Supabase auth.users wird für den Login verwendet (D1, M1).
create table app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'artist')),
  artist_id uuid references artists(id),
  location_id uuid references locations(id)
);

-- ---------- Services (Dienstleistungen, D9) ----------
create table service_categories (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id),
  name text not null,
  sort_order int not null default 0
);

create table services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references service_categories(id) on delete set null,
  name text not null,
  duration_minutes int not null,
  price numeric(10,2) not null,
  active boolean not null default true
);

create table artist_services (
  artist_id uuid references artists(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  primary key (artist_id, service_id)
);

-- ---------- Products (Produkte, D10) ----------
create table product_categories (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id),
  name text not null,
  sort_order int not null default 0
);

create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references product_categories(id) on delete set null,
  name text not null,
  price numeric(10,2) not null,
  barcode text,
  active boolean not null default true
);

-- ---------- Customers (D5/D6) ----------
create table customers (
  id uuid primary key default gen_random_uuid(),
  vorname text not null,
  name text not null,
  email text,
  phone text,
  birthdate date,
  notes text,
  health_notice text,          -- Kurz-Hinweis, der als Callout in D6 angezeigt wird
  created_at timestamptz not null default now()
);

-- Dokumente pro Kunde: Ausweisfotos, Unterschrift, Fotos (D6, N4, N6)
-- Hinweis: appointment_id wird per ALTER TABLE weiter unten ergänzt,
-- da "appointments" erst später in diesem Skript definiert wird.
create table customer_documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  type text not null check (type in ('id_photo','signature','photo')),
  storage_path text not null,   -- Pfad im Supabase Storage Bucket
  created_at timestamptz not null default now()
);

-- Gesundheitsfragebogen (N5) — pro Kunde, key/value + optionales Detail
create table health_questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  question_key text not null,
  answer boolean not null,
  detail_text text,
  created_at timestamptz not null default now()
);

-- Einverständniserklärung (N7)
create table consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  consent_version text not null,
  signature_document_id uuid references customer_documents(id),
  signed_at timestamptz not null default now()
);

-- ---------- Appointments (D2/D3/D17) ----------
create table appointments (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id),
  customer_id uuid references customers(id),
  artist_id uuid references artists(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  type text not null default 'termin' check (type in ('termin','absenz')),
  status text not null default 'gebucht'
    check (status in ('gebucht','kassiert','storniert','nicht_erschienen')),
  notes text,
  created_at timestamptz not null default now()
);

-- Nachträglich ergänzte FK (siehe Hinweis oben bei customer_documents)
alter table customer_documents
  add column appointment_id uuid references appointments(id);

create table appointment_line_items (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  service_id uuid references services(id),
  quantity int not null default 1,
  unit_price numeric(10,2) not null,
  discount_type text check (discount_type in ('percent','chf')),
  discount_value numeric(10,2)
);

-- ---------- Shifts & Absences (D11/D12) ----------
create table shifts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists(id) on delete cascade,
  location_id uuid references locations(id),
  weekday int not null check (weekday between 0 and 6), -- 0 = Montag
  start_time time not null,
  end_time time not null
);

create table absences (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists(id) on delete cascade,
  type text not null check (type in ('ferien','krank','abwesend')),
  start_date date not null,
  end_date date not null,
  half_day text check (half_day in ('none','am','pm')) default 'none'
);

-- ---------- Kasse / Orders (D15/D18) ----------
create table orders (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id),
  customer_id uuid references customers(id),
  location_id uuid references locations(id),
  subtotal numeric(10,2) not null default 0,
  order_discount_type text check (order_discount_type in ('percent','chf')),
  order_discount_value numeric(10,2),
  total numeric(10,2) not null default 0,
  status text not null default 'offen' check (status in ('offen','bezahlt','storniert')),
  created_at timestamptz not null default now()
);

create table order_line_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  service_id uuid references services(id),
  product_id uuid references products(id),
  description text not null,
  quantity int not null default 1,
  unit_price numeric(10,2) not null,
  discount_type text check (discount_type in ('percent','chf')),
  discount_value numeric(10,2),
  line_total numeric(10,2) not null
);

-- ---------- Vouchers (D20/D20b) ----------
create table vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  value numeric(10,2) not null,
  remaining_value numeric(10,2) not null,
  buyer_customer_id uuid references customers(id),
  status text not null default 'aktiv' check (status in ('aktiv','eingelöst','abgelaufen')),
  created_at timestamptz not null default now()
);

-- Split Payment (D18): mehrere Zahlungen pro Order
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  method text not null check (method in ('karte','bar','gutschein')),
  amount numeric(10,2) not null,
  voucher_id uuid references vouchers(id)
);

-- ============================================================
-- Row Level Security — Grundgerüst
-- (Detail-Policies folgen, sobald die Rollen final sind:
--  admin = voller Zugriff, artist = nur eigene Termine/Kasse/Kunden)
-- ============================================================
alter table customers enable row level security;
alter table appointments enable row level security;
alter table orders enable row level security;
alter table customer_documents enable row level security;
alter table health_questionnaire_responses enable row level security;
alter table consents enable row level security;
-- weitere Tabellen analog, je nach Sensitivität
