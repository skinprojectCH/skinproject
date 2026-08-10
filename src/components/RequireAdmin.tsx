import { Navigate, Outlet } from 'react-router-dom';
import { useLocationContext } from '../lib/locationContext';

// Strenger als RequireBackoffice: nur Admin darf rein, nicht mal Manager.
// Für Kunden-Import/-Export -- Massenoperationen auf der ganzen Kundendatenbank,
// die Roger bewusst nur dem Hauptadmin vorbehalten will.
export default function RequireAdmin() {
  const { locationsLoaded, isAdmin } = useLocationContext();

  if (!locationsLoaded) return null;

  if (!isAdmin) {
    return <Navigate to="/kunden" replace />;
  }

  return <Outlet />;
}
