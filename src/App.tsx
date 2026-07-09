import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import RequireAuth from './components/RequireAuth';
import Login from './pages/Login';
import Kalender from './pages/Kalender';
import Kasse from './pages/Kasse';
import Kunden from './pages/Kunden';
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
import Gutscheine from './pages/admin/Gutscheine';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/kalender" replace />} />
        <Route path="/kalender" element={<Kalender />} />
        <Route path="/kasse" element={<Kasse />} />
        <Route path="/kunden" element={<Kunden />} />
        <Route path="/kunden/:id" element={<KundeDetail />} />

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
        <Route path="/admin/gutscheine" element={<Gutscheine />} />
        </Route>
      </Route>
    </Routes>
  );
}
