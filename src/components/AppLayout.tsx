import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { LocationProvider } from '../lib/locationContext';

export default function AppLayout() {
  return (
    <LocationProvider>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <div className="kasse-no-print">
          <Sidebar />
        </div>
        <div style={{ flex: 1, padding: 32, minWidth: 0 }}>
          <Outlet />
        </div>
      </div>
    </LocationProvider>
  );
}
