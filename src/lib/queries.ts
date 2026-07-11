import { supabase } from './supabaseClient';

// ---------- Types (spiegeln db/schema.sql) ----------
export interface Artist {
  id: string;
  name: string;
  kuenstlername: string | null;
  email: string | null;
  phone: string | null;
  revenue_share_pct: number;
  calendar_color: string;
  status: 'active' | 'inactive';
  location_id: string | null;
  strasse: string | null;
  plz_ort: string | null;
  ahv_nummer: string | null;
  mwst_aktiv: boolean;
  mwst_nummer: string | null;
  mwst_prozent: number | null;
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
  strasse: string | null;
  plz_ort: string | null;
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
  location_id: string | null;
  start_time: string;
  end_time: string;
  type: 'termin' | 'absenz';
  status: 'gebucht' | 'kassiert' | 'storniert' | 'nicht_erschienen';
  notes: string | null;
}

export interface Location {
  id: string;
  name: string;
  address: string | null;
  vat_number: string | null;
  strasse: string | null;
  plz_ort: string | null;
  telefon: string | null;
  email: string | null;
  mwst_prozent: number | null;
}

export interface LocationManager {
  id: string;
  location_id: string;
  vorname: string;
  name: string;
  email: string | null;
  telefon: string | null;
}

// ---------- Locations ----------
export async function fetchCurrentUserLocationId() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await supabase.from('app_users').select('location_id').eq('id', userData.user.id).maybeSingle();
  if (error) return null; // z.B. noch kein app_users-Eintrag für diesen Login vorhanden
  return data?.location_id ?? null;
}

export async function fetchLocations() {
  const { data, error } = await supabase.from('locations').select('*').order('name');
  if (error) throw error;
  return data as Location[];
}

export async function createLocation(input: { name: string; strasse: string | null; plz_ort: string | null; telefon: string | null; email: string | null; vat_number: string | null; mwst_prozent: number | null }) {
  const { data, error } = await supabase.from('locations').insert(input).select().single();
  if (error) throw error;
  return data as Location;
}

export async function updateLocation(id: string, patch: Partial<Location>) {
  const { error } = await supabase.from('locations').update(patch).eq('id', id);
  if (error) throw error;
}

// ---------- Location-Manager ----------
export async function fetchLocationManagers(locationId: string) {
  const { data, error } = await supabase.from('location_managers').select('*').eq('location_id', locationId);
  if (error) throw error;
  return data as LocationManager[];
}

export async function createLocationManager(input: { location_id: string; vorname: string; name: string; email: string | null; telefon: string | null }) {
  const { data, error } = await supabase.from('location_managers').insert(input).select().single();
  if (error) throw error;
  return data as LocationManager;
}

export async function updateLocationManager(id: string, patch: Partial<LocationManager>) {
  const { error } = await supabase.from('location_managers').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteLocationManager(id: string) {
  const { error } = await supabase.from('location_managers').delete().eq('id', id);
  if (error) throw error;
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

export async function createArtist(input: Partial<Omit<Artist, 'id'>> & { name: string }) {
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

export async function updateCustomer(id: string, patch: Partial<Customer>) {
  const { error } = await supabase.from('customers').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteCustomer(id: string) {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Kunden-Dokumente & Fotos (Supabase Storage: Bucket "customer-files") ----------
export interface CustomerDocument {
  id: string;
  customer_id: string;
  appointment_id: string | null;
  type: 'id_photo' | 'signature' | 'photo' | 'document';
  storage_path: string;
  file_name: string | null;
  created_at: string;
}

export async function fetchCustomerDocuments(customerId: string) {
  const { data, error } = await supabase.from('customer_documents').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as CustomerDocument[];
}

// appointmentId optional: ordnet die Datei einem bestimmten Termin zu (statt nur dem Kunden allgemein)
export async function uploadCustomerFile(customerId: string, file: File, type: 'document' | 'photo', appointmentId?: string | null) {
  const ext = file.name.split('.').pop();
  const path = `${customerId}/${type}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('customer-files').upload(path, file);
  if (uploadError) throw uploadError;
  const { data, error } = await supabase
    .from('customer_documents')
    .insert({ customer_id: customerId, type, storage_path: path, appointment_id: appointmentId || null, file_name: file.name })
    .select()
    .single();
  if (error) throw error;
  return data as CustomerDocument;
}

export async function getCustomerFileUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from('customer-files').createSignedUrl(storagePath, 60 * 5);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteCustomerDocument(doc: CustomerDocument) {
  const { error: storageError } = await supabase.storage.from('customer-files').remove([doc.storage_path]);
  if (storageError) throw storageError;
  const { error } = await supabase.from('customer_documents').delete().eq('id', doc.id);
  if (error) throw error;
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
export async function fetchAppointmentsForDay(dateISO: string, locationId?: string) {
  const start = `${dateISO}T00:00:00`;
  const end = `${dateISO}T23:59:59`;
  let query = supabase
    .from('appointments')
    .select('*, customers(vorname, name, phone), artists(name, calendar_color), appointment_line_items(service_id, services(name))')
    .gte('start_time', start)
    .lte('start_time', end)
    .order('start_time');
  if (locationId) query = query.eq('location_id', locationId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function addAppointmentLineItems(appointmentId: string, items: { service_id: string; quantity: number; unit_price: number }[]) {
  if (items.length === 0) return;
  const { error } = await supabase.from('appointment_line_items').insert(items.map((i) => ({ ...i, appointment_id: appointmentId })));
  if (error) throw error;
}

export async function fetchAppointmentLineItems(appointmentId: string) {
  const { data, error } = await supabase.from('appointment_line_items').select('*, services(name, duration_minutes)').eq('appointment_id', appointmentId);
  if (error) throw error;
  return data;
}

export async function replaceAppointmentLineItems(appointmentId: string, items: { service_id: string; quantity: number; unit_price: number }[]) {
  const { error: deleteError } = await supabase.from('appointment_line_items').delete().eq('appointment_id', appointmentId);
  if (deleteError) throw deleteError;
  await addAppointmentLineItems(appointmentId, items);
}

export async function fetchDocumentsForAppointment(appointmentId: string) {
  const { data, error } = await supabase.from('customer_documents').select('*').eq('appointment_id', appointmentId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as CustomerDocument[];
}

export async function fetchAppointmentsForCustomer(customerId: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, artists(name), appointment_line_items(quantity, unit_price, services(name)), orders(total, status)')
    .eq('customer_id', customerId)
    .order('start_time', { ascending: false });
  if (error) throw error;
  return data;
}

// Verkäufe ohne Termin (z.B. reiner Artikelverkauf an der Kasse) — damit sie trotzdem
// im Kalender/Kassenbuch sichtbar sind, statt spurlos zu verschwinden.
export async function fetchWalkInOrdersForDay(dateISO: string, locationId?: string) {
  const start = `${dateISO}T00:00:00`;
  const end = `${dateISO}T23:59:59`;
  let query = supabase
    .from('orders')
    .select('*, customers(vorname, name, phone), order_line_items(description, quantity, unit_price)')
    .is('appointment_id', null)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at');
  if (locationId) query = query.eq('location_id', locationId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchOrderForAppointment(appointmentId: string) {
  const { data: order, error } = await supabase.from('orders').select('*').eq('appointment_id', appointmentId).maybeSingle();
  if (error) throw error;
  if (!order) return null;
  const [{ data: lineItems, error: liError }, { data: payments, error: payError }] = await Promise.all([
    supabase.from('order_line_items').select('*, services(name), products(name)').eq('order_id', order.id),
    supabase.from('payments').select('*').eq('order_id', order.id),
  ]);
  if (liError) throw liError;
  if (payError) throw payError;
  return { order, lineItems: lineItems || [], payments: payments || [] };
}

export async function fetchAppointment(id: string) {
  const { data, error } = await supabase.from('appointments').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Appointment;
}

export async function createAppointment(input: {
  customer_id: string | null;
  artist_id: string;
  location_id?: string | null;
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
export async function fetchVoucherByCode(code: string) {
  const { data, error } = await supabase.from('vouchers').select('*').ilike('code', code.trim()).maybeSingle();
  if (error) throw error;
  return data as Voucher | null;
}

export async function checkoutOrder(input: {
  appointmentId: string | null;
  customerId: string | null;
  locationId: string | null;
  subtotal: number;
  discountType: 'percent' | 'chf' | null;
  discountValue: number | null;
  total: number;
  lineItems: { service_id?: string | null; product_id?: string | null; description: string; quantity: number; unit_price: number; line_total: number }[];
  payments: { method: string; amount: number; voucher_id?: string | null }[];
  vouchersToCreate?: { code: string; value: number; buyer_customer_id?: string | null }[];
}) {
  const { data, error } = await supabase.rpc('checkout_order', {
    p_appointment_id: input.appointmentId,
    p_customer_id: input.customerId,
    p_location_id: input.locationId,
    p_subtotal: input.subtotal,
    p_discount_type: input.discountType,
    p_discount_value: input.discountValue,
    p_total: input.total,
    p_line_items: input.lineItems,
    p_payments: input.payments,
    p_vouchers: input.vouchersToCreate || [],
  });
  if (error) throw error;
  return data as string;
}

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
export interface Absence {
  id: string;
  artist_id: string;
  type: 'ferien' | 'krank' | 'abwesend';
  start_date: string;
  end_date: string;
  half_day: 'none' | 'am' | 'pm';
  notes: string | null;
}

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
  notes?: string | null;
}) {
  const { data, error } = await supabase.from('absences').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateAbsence(id: string, patch: Partial<Absence>) {
  const { error } = await supabase.from('absences').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteAbsence(id: string) {
  const { error } = await supabase.from('absences').delete().eq('id', id);
  if (error) throw error;
}

export interface Shift {
  id: string;
  artist_id: string;
  location_id: string | null;
  weekday: number;
  start_time: string;
  end_time: string;
  valid_from: string;
  valid_to: string | null;
}

export async function fetchShiftsForArtist(artistId: string) {
  const { data, error } = await supabase.from('shifts').select('*').eq('artist_id', artistId).order('weekday');
  if (error) throw error;
  return data as Shift[];
}

// Ersetzt den kompletten Wochenplan eines Artists (an dieser Location) durch die neuen
// Zeitfenster + Gültigkeitszeitraum. Einfacher und robuster als ein Diff.
export async function replaceArtistShifts(
  artistId: string,
  locationId: string,
  validFrom: string,
  validTo: string | null,
  slots: { weekday: number; start_time: string; end_time: string }[]
) {
  const { error: deleteError } = await supabase.from('shifts').delete().eq('artist_id', artistId);
  if (deleteError) throw deleteError;
  if (slots.length === 0) return;
  const { error: insertError } = await supabase.from('shifts').insert(
    slots.map((s) => ({ artist_id: artistId, location_id: locationId, weekday: s.weekday, start_time: s.start_time, end_time: s.end_time, valid_from: validFrom, valid_to: validTo }))
  );
  if (insertError) throw insertError;
}

// Für den Kalender: alle Schichten für eine Liste von Artists an einem bestimmten Datum
// (berücksichtigt Wochentag + Gültigkeitszeitraum).
export async function fetchAbsencesForDate(artistIds: string[], dateISO: string) {
  if (artistIds.length === 0) return [];
  const { data, error } = await supabase
    .from('absences')
    .select('*')
    .in('artist_id', artistIds)
    .lte('start_date', dateISO)
    .gte('end_date', dateISO);
  if (error) throw error;
  return data as Absence[];
}

export async function fetchShiftsForDate(artistIds: string[], dateISO: string) {
  if (artistIds.length === 0) return [];
  const weekday = (new Date(dateISO).getDay() + 6) % 7; // JS: So=0..Sa=6 -> wir wollen Mo=0..So=6
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .in('artist_id', artistIds)
    .eq('weekday', weekday)
    .lte('valid_from', dateISO)
    .or(`valid_to.is.null,valid_to.gte.${dateISO}`);
  if (error) throw error;
  return data as Shift[];
}
