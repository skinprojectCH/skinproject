import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import RequireAuth from './components/RequireAuth';
import RequireBackoffice from './components/RequireBackoffice';
import RequireAdmin from './components/RequireAdmin';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Kalender from './pages/Kalender';
import Kasse from './pages/Kasse';
import Kunden from './pages/Kunden';
import KundenImport from './pages/admin/KundenImport';
import KundenExport from './pages/admin/KundenExport';
import KundeDetail from './pages/KundeDetail';
import AdminIndex from './pages/admin/AdminIndex';
import Artists from './pages/admin/Artists';
import ArtistDetail from './pages/admin/ArtistDetail';
import Dienstleistungen from './pages/admin/Dienstleistungen';
import Produkte from './pages/admin/Produkte';
import Schichtplan from './pages/admin/Schichtplan';
import Absenzen from './pages/admin/Absenzen';
import Statistiken from './pages/admin/Statistiken';
import Abrechnung from './pages/admin/Abrechnung';
import Locations from './pages/admin/Locations';
import Einstellungen from './pages/admin/Einstellungen';
import Gutscheine from './pages/admin/Gutscheine';
import Anzahlungen from './pages/admin/Anzahlungen';
import ArtistApp from './pages/artist/ArtistApp';
import RegisterCustomer from './pages/register/RegisterCustomer';
import GutscheinKaufen from './pages/public/GutscheinKaufen';
import GutscheinErfolg from './pages/public/GutscheinErfolg';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/artist/:artistId" element={<ArtistApp />} />
      <Route path="/register/:locationId" element={<RegisterCustomer />} />
      <Route path="/gutschein-kaufen" element={<GutscheinKaufen />} />
      <Route path="/gutschein-kaufen/erfolg" element={<GutscheinErfolg />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/kalender" replace />} />
        <Route path="/kalender" element={<Kalender />} />
        <Route path="/kasse" element={<Kasse />} />
        <Route path="/kunden" element={<Kunden />} />
        <Route path="/kunden/:id" element={<KundeDetail />} />

        <Route element={<RequireAdmin />}>
          <Route path="/admin/kundenimport" element={<KundenImport />} />
          <Route path="/admin/kundenexport" element={<KundenExport />} />
        </Route>

        <Route element={<RequireBackoffice />}>
          <Route path="/admin" element={<AdminIndex />} />
          <Route path="/admin/artists" element={<Artists />} />
          <Route path="/admin/artists/:id" element={<ArtistDetail />} />
          <Route path="/admin/dienstleistungen" element={<Dienstleistungen />} />
          <Route path="/admin/produkte" element={<Produkte />} />
          <Route path="/admin/schichtplan" element={<Schichtplan />} />
          <Route path="/admin/absenzen" element={<Absenzen />} />
          <Route path="/admin/statistiken" element={<Statistiken />} />
          <Route path="/admin/abrechnung" element={<Abrechnung />} />
          <Route path="/admin/locations" element={<Locations />} />
          <Route path="/admin/einstellungen" element={<Einstellungen />} />
          <Route path="/admin/gutscheine" element={<Gutscheine />} />
          <Route path="/admin/anzahlungen" element={<Anzahlungen />} />
        </Route>
        </Route>
      </Route>
    </Routes>
  );
}
