import { NavLink, useLocation } from 'react-router-dom';
import { useLocationContext } from '../lib/locationContext';

const ADMIN_SUB_ITEMS: { key: string; label: string; path: string }[] = [
  { key: 'artists', label: 'Artists', path: '/admin/artists' },
  { key: 'dienstleistungen', label: 'Dienstleistungen', path: '/admin/dienstleistungen' },
  { key: 'produkte', label: 'Produkte', path: '/admin/produkte' },
  { key: 'schichtplan', label: 'Schichtplan', path: '/admin/schichtplan' },
  { key: 'absenzen', label: 'Absenzen', path: '/admin/absenzen' },
  { key: 'statistiken', label: 'Statistiken', path: '/admin/statistiken' },
  { key: 'abrechnung', label: 'Abrechnung', path: '/admin/abrechnung' },
  { key: 'locations', label: 'Locations', path: '/admin/locations' },
  { key: 'gutscheine', label: 'Gutscheine', path: '/admin/gutscheine' },
];

const TOP_ITEMS = [
  { key: 'kalender', label: 'Kalender', path: '/kalender' },
  { key: 'kasse', label: 'Kasse', path: '/kasse' },
  { key: 'kunden', label: 'Kunden', path: '/kunden' },
];

function itemStyle(isActive: boolean): React.CSSProperties {
  return {
    padding: '11px 20px',
    background: isActive ? 'var(--color-accent)' : 'transparent',
    color: isActive ? '#fff' : '#bbb',
    fontWeight: isActive ? 600 : 400,
    textDecoration: 'none',
    display: 'block',
  };
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'var(--color-accent)' : 'none'} stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function LocationSwitcher() {
  const { locations, locationsLoaded, selectedLocationId, setSelectedLocationId, favoriteLocationId, toggleFavorite } = useLocationContext();

  if (!locationsLoaded || locations.length === 0) return null;

  return (
    <div style={{ padding: '0 20px 18px' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: '#888', marginBottom: 6 }}>Standort</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <select
          value={selectedLocationId}
          onChange={(e) => setSelectedLocationId(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.18)',
            color: '#eee',
            padding: '7px 8px',
            fontSize: 12,
            borderRadius: 4,
            fontFamily: 'var(--font-body)',
          }}
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id} style={{ color: '#111' }}>
              {l.name}
            </option>
          ))}
        </select>
        <button
          onClick={toggleFavorite}
          title={favoriteLocationId === selectedLocationId ? 'Als Favorit entfernen' : 'Als Favorit markieren'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4, flexShrink: 0 }}
        >
          <StarIcon filled={favoriteLocationId === selectedLocationId} />
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const isAdminSection = location.pathname.startsWith('/admin');

  return (
    <div
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--color-primary)',
        padding: '24px 0',
        flexShrink: 0,
        fontFamily: 'var(--font-body)',
        fontSize: 13,
      }}
    >
      <nav style={{ display: 'flex', flexDirection: 'column' }}>
        <LocationSwitcher />

        {TOP_ITEMS.map((item) => (
          <NavLink key={item.key} to={item.path} style={({ isActive }) => itemStyle(isActive)}>
            {item.label}
          </NavLink>
        ))}

        <NavLink to="/admin" style={() => itemStyle(isAdminSection)}>
          Admin
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'inline-block', verticalAlign: -2, marginLeft: 4 }}
          >
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </NavLink>

        {isAdminSection && (
          <>
            <div style={{ padding: '2px 20px 8px', fontSize: 10, color: '#888' }}>
              Nur Hauptadmin
            </div>
            {ADMIN_SUB_ITEMS.map((sub) => (
              <NavLink
                key={sub.key}
                to={sub.path}
                style={({ isActive }) => ({
                  padding: '8px 20px 8px 34px',
                  fontSize: 12,
                  background: isActive ? 'var(--color-accent)' : 'transparent',
                  color: isActive ? '#fff' : '#999',
                  textDecoration: 'none',
                  display: 'block',
                })}
              >
                {sub.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </div>
  );
}
