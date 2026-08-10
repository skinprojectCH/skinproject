import { Navigate, Outlet } from 'react-router-dom';
import { useLocationContext } from '../lib/locationContext';

// Zusätzlich zur versteckten Sidebar: blockiert Angestellte auch bei direkter
// URL-Eingabe von Backoffice-Seiten (Settings, Gutschein & Anzahlung, Service &
// Artikel, Analytik) -- Admin und Manager dürfen rein, Angestellte werden zurück
// zum Kalender geschickt.
export default function RequireBackoffice() {
  const { locationsLoaded, canAccessBackoffice } = useLocationContext();

  // Solange die Rolle noch lädt, nichts rendern -- sonst blitzt die Seite kurz auf,
  // bevor der Redirect greift.
  if (!locationsLoaded) return null;

  if (!canAccessBackoffice) {
    return <Navigate to="/kalender" replace />;
  }

  return <Outlet />;
}
