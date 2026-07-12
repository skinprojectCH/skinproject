import { NavLink, useLocation } from 'react-router-dom';
import { useLocationContext } from '../lib/locationContext';

interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: (active: boolean) => React.ReactNode;
  children?: { key: string; label: string; path: string }[];
}

const ICON_PROPS = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function CalendarIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

function KasseIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M2 20h20" />
      <path d="M9 11h6" />
    </svg>
  );
}

function SmileyIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2.4M12 18.1v2.4M20.5 12h-2.4M5.9 12H3.5M17.6 6.4l-1.7 1.7M8.1 15.9l-1.7 1.7M17.6 17.6l-1.7-1.7M8.1 8.1L6.4 6.4" />
    </svg>
  );
}

function GutscheinIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3.5" y="9.5" width="17" height="11" rx="1.5" />
      <path d="M3.5 13.5h17" />
      <path d="M12 9.5v11" />
      <path d="M12 9.5c-1.4-3-6-3.2-6 0" />
      <path d="M12 9.5c1.4-3 6-3.2 6 0" />
    </svg>
  );
}

function InventarIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 3l8 4.6v8.8L12 21l-8-4.6V7.6z" />
      <path d="M4 7.6L12 12l8-4.4" />
      <path d="M12 12v9" />
    </svg>
  );
}

function AnalytikIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 12V3.5A8.5 8.5 0 1 1 3.5 12H12z" />
      <path d="M12 12L20 8" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'var(--color-accent)' : 'none'} stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { key: 'kalender', label: 'Kalender', path: '/kalender', icon: () => <CalendarIcon /> },
  { key: 'kasse', label: 'Kasse', path: '/kasse', icon: () => <KasseIcon /> },
  { key: 'kunden', label: 'Kunden', path: '/kunden', icon: () => <SmileyIcon /> },
  {
    key: 'personal',
    label: 'Settings',
    path: '/admin/artists',
    icon: () => <SettingsIcon />,
    children: [
      { key: 'artists', label: 'Artists', path: '/admin/artists' },
      { key: 'schichtplan', label: 'Schichtplan', path: '/admin/schichtplan' },
      { key: 'absenzen', label: 'Absenzen', path: '/admin/absenzen' },
      { key: 'locations', label: 'Locations', path: '/admin/locations' },
    ],
  },
  {
    key: 'gutscheine',
    label: 'Gutscheine',
    path: '/admin/gutscheine',
    icon: () => <GutscheinIcon />,
  },
  {
    key: 'inventar',
    label: 'Service & Artikel',
    path: '/admin/produkte',
    icon: () => <InventarIcon />,
    children: [
      { key: 'produkte', label: 'Produkte', path: '/admin/produkte' },
      { key: 'dienstleistungen', label: 'Dienstleistungen', path: '/admin/dienstleistungen' },
    ],
  },
  {
    key: 'analytik',
    label: 'Analytik',
    path: '/admin/statistiken',
    icon: () => <AnalytikIcon />,
    children: [
      { key: 'statistiken', label: 'Statistiken', path: '/admin/statistiken' },
      { key: 'abrechnung', label: 'Abrechnung', path: '/admin/abrechnung' },
    ],
  },
];

function LocationSwitcher() {
  const { locations, locationsLoaded, selectedLocationId, setSelectedLocationId, favoriteLocationId, toggleFavorite } = useLocationContext();

  if (!locationsLoaded || locations.length === 0) return null;

  return (
    <div style={{ padding: '0 14px 18px' }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, color: '#888', marginBottom: 6, textAlign: 'center' }}>Standort</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <select
          value={selectedLocationId}
          onChange={(e) => setSelectedLocationId(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.18)',
            color: '#eee',
            padding: '6px 4px',
            fontSize: 11,
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

        {NAV_ITEMS.map((item) => {
          const isActive = item.children ? location.pathname.startsWith('/admin/') && item.children.some((c) => location.pathname.startsWith(c.path)) : location.pathname.startsWith(item.path);
          return (
            <div key={item.key}>
              <NavLink
                to={item.path}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  padding: '12px 6px',
                  margin: '0 10px 4px',
                  borderRadius: 10,
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: isActive ? '#fff' : '#999',
                  textDecoration: 'none',
                }}
              >
                {item.icon(isActive)}
                <div style={{ fontSize: 11, fontWeight: isActive ? 600 : 400 }}>{item.label}</div>
              </NavLink>

              {isActive && item.children && (
                <div style={{ display: 'flex', flexDirection: 'column', margin: '0 10px 8px', gap: 1 }}>
                  {item.children.map((c) => (
                    <NavLink
                      key={c.key}
                      to={c.path}
                      style={({ isActive: childActive }) => ({
                        padding: '6px 10px 6px 40px',
                        fontSize: 11.5,
                        borderRadius: 6,
                        background: childActive ? 'var(--color-accent)' : 'transparent',
                        color: childActive ? '#fff' : '#999',
                        textDecoration: 'none',
                      })}
                    >
                      {c.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
