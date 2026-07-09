import { supabase } from './supabaseClient';

// ---------- Types (spiegeln db/schema.sql) ----------
export interface Artist {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  revenue_share_pct: number;
  calendar_color: string;
  status: 'active' | 'inactive';
}

export interface Customer {
  id: string;
  vorname: string;
  name: string;
  email: string | null;
  phone: string | null;
  birthdate: string | null;
  notes: string | null;
  health_notice: string | null;
}

export interface ServiceCategory {
  id: string;
  name: string;
  active: boolean;
}

export interface Service {
  id: string;
  category_id: string | null;
  name: string;
  duration_minutes: number;
  price: number;
  description: string | null;
  active: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  active: boolean;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  price: number;
  barcode: string | null;
  description: string | null;
  active: boolean;
}

export interface Appointment {
  id: string;
  customer_id: string | null;
  artist_id: string | null;
  start_time: string;
  end_time: string;
  type: 'termin' | 'absenz';
  status: 'gebucht' | 'kassiert' | 'storniert' | 'nicht_erschienen';
}

export interface Location {
  id: string;
  name: string;
  address: string | null;
  vat_number: string | null;
}

export interface Voucher {
  id: string;
  code: string;
  value: number;
  remaining_value: number;
  buyer_customer_id: string | null;
  status: 'aktiv' | 'eingelöst' | 'abgelaufen';
  created_at: string;
}

// ---------- Artists ----------
export async function fetchArtists() {
  const { data, error } = await supabase.from('artists').select('*').order('name');
  if (error) throw error;
  return data as Artist[];
}

export async function createArtist(input: {
  name: string;
  email: string | null;
  phone: string | null;
  revenue_share_pct: number;
  calendar_color: string;
  status: 'active' | 'inactive';
}) {
  const { data, error } = await supabase.from('artists').insert(input).select().single();
  if (error) throw error;
  return data as Artist;
}

export async function updateArtist(id: string, patch: Partial<Artist>) {
  const { error } = await supabase.from('artists').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteArtist(id: string) {
  const { error } = await supabase.from('artists').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchArtistServiceIds(artistId: string) {
  const { data, error } = await supabase.from('artist_services').select('service_id').eq('artist_id', artistId);
  if (error) throw error;
  return (data || []).map((row) => row.service_id as string);
}

// Ersetzt die komplette Zuordnung (löscht bestehende, fügt neue ein) — einfacher und
// robuster als ein Diff, für die überschaubare Anzahl Services pro Artist unproblematisch.
export async function setArtistServiceIds(artistId: string, serviceIds: string[]) {
  const { error: deleteError } = await supabase.from('artist_services').delete().eq('artist_id', artistId);
  if (deleteError) throw deleteError;
  if (serviceIds.length === 0) return;
  const { error: insertError } = await supabase.from('artist_services').insert(serviceIds.map((service_id) => ({ artist_id: artistId, service_id })));
  if (insertError) throw insertError;
}

// ---------- Customers ----------
export async function fetchCustomers() {
  const { data, error } = await supabase.from('customers').select('*').order('name');
  if (error) throw error;
  return data as Customer[];
}

export async function fetchCustomer(id: string) {
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Customer;
}

export async function createCustomer(input: Partial<Customer>) {
  const { data, error } = await supabase.from('customers').insert(input).select().single();
  if (error) throw error;
  return data as Customer;
}

// ---------- Services / Products ----------
export async function fetchServiceCategories() {
  const { data, error } = await supabase.from('service_categories').select('*').order('sort_order');
  if (error) throw error;
  return data as ServiceCategory[];
}

export async function createServiceCategory(name: string) {
  const { data, error } = await supabase.from('service_categories').insert({ name }).select().single();
  if (error) throw error;
  return data as ServiceCategory;
}

// Zählt, wie viele Dienstleistungen dieser Kategorie zugeordnet sind (unabhängig vom Aktiv-Status).
export async function countServicesInCategory(categoryId: string) {
  const { count, error } = await supabase.from('services').select('id', { count: 'exact', head: true }).eq('category_id', categoryId);
  if (error) throw error;
  return count || 0;
}

// Kategorie aktualisieren. Beim Deaktivieren werden alle zugeordneten Dienstleistungen
// automatisch mitdeaktiviert (Kaskade), damit sie z.B. in der Kasse nicht mehr auswählbar sind.
// Historische Daten (Termine, Bestellungen) bleiben davon unberührt — es wird nichts gelöscht.
export async function updateServiceCategory(id: string, name: string, active: boolean) {
  const { error } = await supabase.from('service_categories').update({ name, active }).eq('id', id);
  if (error) throw error;
  if (!active) {
    const { error: cascadeError } = await supabase.from('services').update({ active: false }).eq('category_id', id);
    if (cascadeError) throw cascadeError;
  }
}

// Löschen ist nur erlaubt, wenn keine Dienstleistung (aktiv oder inaktiv) dieser Kategorie
// zugeordnet ist — so bleibt die Historie unangetastet und es entstehen keine verwaisten Referenzen.
export async function deleteServiceCategory(id: string) {
  const count = await countServicesInCategory(id);
  if (count > 0) {
    throw new Error(
      `Diese Kategorie enthält noch ${count} Dienstleistung${count === 1 ? '' : 'en'}. Kategorien mit zugeordneten Dienstleistungen können nicht gelöscht werden — stattdessen auf "Inaktiv" setzen.`
    );
  }
  const { error } = await supabase.from('service_categories').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchServices() {
  const { data, error } = await supabase.from('services').select('*').order('name');
  if (error) throw error;
  return data as Service[];
}

export async function createService(input: {
  name: string;
  price: number;
  duration_minutes: number;
  description: string | null;
  category_id: string | null;
  active: boolean;
}) {
  const { data, error } = await supabase.from('services').insert(input).select().single();
  if (error) throw error;
  return data as Service;
}

export async function updateService(id: string, patch: Partial<Service>) {
  const { error } = await supabase.from('services').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteService(id: string) {
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchProductCategories() {
  const { data, error } = await supabase.from('product_categories').select('*').order('sort_order');
  if (error) throw error;
  return data as ProductCategory[];
}

export async function createProductCategory(name: string) {
  const { data, error } = await supabase.from('product_categories').insert({ name }).select().single();
  if (error) throw error;
  return data as ProductCategory;
}

export async function countProductsInCategory(categoryId: string) {
  const { count, error } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('category_id', categoryId);
  if (error) throw error;
  return count || 0;
}

// Beim Deaktivieren werden alle zugeordneten Produkte automatisch mitdeaktiviert (Kaskade).
// Historische Daten (Bestellungen) bleiben unberührt — es wird nichts gelöscht.
export async function updateProductCategory(id: string, name: string, active: boolean) {
  const { error } = await supabase.from('product_categories').update({ name, active }).eq('id', id);
  if (error) throw error;
  if (!active) {
    const { error: cascadeError } = await supabase.from('products').update({ active: false }).eq('category_id', id);
    if (cascadeError) throw cascadeError;
  }
}

// Löschen nur erlaubt, wenn kein Produkt (aktiv oder inaktiv) dieser Kategorie zugeordnet ist.
export async function deleteProductCategory(id: string) {
  const count = await countProductsInCategory(id);
  if (count > 0) {
    throw new Error(
      `Diese Kategorie enthält noch ${count} Produkt${count === 1 ? '' : 'e'}. Kategorien mit zugeordneten Produkten können nicht gelöscht werden — stattdessen auf "Inaktiv" setzen.`
    );
  }
  const { error } = await supabase.from('product_categories').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchProducts() {
  const { data, error } = await supabase.from('products').select('*').order('name');
  if (error) throw error;
  return data as Product[];
}

export async function createProduct(input: {
  name: string;
  price: number;
  barcode: string | null;
  description: string | null;
  category_id: string | null;
  active: boolean;
}) {
  const { data, error } = await supabase.from('products').insert(input).select().single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(id: string, patch: Partial<Product>) {
  const { error } = await supabase.from('products').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Appointments ----------
export async function fetchAppointmentsForDay(dateISO: string) {
  const start = `${dateISO}T00:00:00`;
  const end = `${dateISO}T23:59:59`;
  const { data, error } = await supabase
    .from('appointments')
    .select('*, customers(vorname, name), artists(name, calendar_color)')
    .gte('start_time', start)
    .lte('start_time', end)
    .order('start_time');
  if (error) throw error;
  return data;
}

export async function createAppointment(input: {
  customer_id: string | null;
  artist_id: string;
  start_time: string;
  end_time: string;
  type?: 'termin' | 'absenz';
}) {
  const { data, error } = await supabase.from('appointments').insert(input).select().single();
  if (error) throw error;
  return data as Appointment;
}

export async function updateAppointment(id: string, patch: Partial<Appointment>) {
  const { data, error } = await supabase.from('appointments').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Appointment;
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Orders / Kasse ----------
export async function createOrder(input: {
  appointment_id?: string | null;
  customer_id?: string | null;
  subtotal: number;
  order_discount_type?: 'percent' | 'chf' | null;
  order_discount_value?: number | null;
  total: number;
}) {
  const { data, error } = await supabase.from('orders').insert({ ...input, status: 'bezahlt' }).select().single();
  if (error) throw error;
  return data;
}

export async function addOrderLineItems(
  orderId: string,
  items: { service_id?: string; product_id?: string; description: string; quantity: number; unit_price: number; line_total: number }[]
) {
  const { error } = await supabase.from('order_line_items').insert(items.map((i) => ({ ...i, order_id: orderId })));
  if (error) throw error;
}

export async function addPayments(orderId: string, payments: { method: string; amount: number }[]) {
  const { error } = await supabase.from('payments').insert(payments.map((p) => ({ ...p, order_id: orderId })));
  if (error) throw error;
}

// ---------- Locations ----------
export async function fetchLocations() {
  const { data, error } = await supabase.from('locations').select('*').order('name');
  if (error) throw error;
  return data as Location[];
}

// ---------- Vouchers ----------
export async function fetchVouchers() {
  const { data, error } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Voucher[];
}

export async function createVoucher(input: { code: string; value: number; buyer_customer_id?: string | null }) {
  const { data, error } = await supabase
    .from('vouchers')
    .insert({ code: input.code, value: input.value, remaining_value: input.value, buyer_customer_id: input.buyer_customer_id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Voucher;
}

// ---------- Absences / Shifts ----------
export async function fetchAbsences() {
  const { data, error } = await supabase.from('absences').select('*, artists(name)').order('start_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createAbsence(input: {
  artist_id: string;
  type: 'ferien' | 'krank' | 'abwesend';
  start_date: string;
  end_date: string;
  half_day?: 'none' | 'am' | 'pm';
}) {
  const { data, error } = await supabase.from('absences').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function fetchShifts(artistId: string) {
  const { data, error } = await supabase.from('shifts').select('*').eq('artist_id', artistId).order('weekday');
  if (error) throw error;
  return data;
}
