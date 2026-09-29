import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { LocationProvider, useLocationContext } from '../lib/locationContext';
import AiSupport from './AiSupport';

export default function AppLayout() {
  return (
    <LocationProvider>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <div className="kasse-no-print">
          <Sidebar />
        </div>
        <div className="app-main" style={{ flex: 1, padding: 32, minWidth: 0 }}>
          <Outlet />
        </div>
      </div>
      <AiSupportWithRole />
    </LocationProvider>
  );
}

function AiSupportWithRole() {
  const { role } = useLocationContext();
  return <AiSupport role={role} />;
}
