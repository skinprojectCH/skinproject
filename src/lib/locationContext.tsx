import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchLocations, fetchCurrentAppUser, type Location, type CurrentAppUser } from './queries';

const FAVORITE_LOCATION_KEY = 'skinproject:favoriteLocationId';

interface LocationContextValue {
  locations: Location[];
  locationsLoaded: boolean;
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
  favoriteLocationId: string | null;
  toggleFavorite: () => void;
  isLocationLocked: boolean;
  accountLocationId: string | null;
  role: CurrentAppUser['role'];
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
  isArtist: boolean;
  // "Backoffice"-Rollen (Admin + Manager) dürfen Settings/Gutscheine/Service &
  // Artikel/Analytik öffnen -- Angestellte nicht.
  canAccessBackoffice: boolean;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [favoriteLocationId, setFavoriteLocationId] = useState<string | null>(() => localStorage.getItem(FAVORITE_LOCATION_KEY));
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [accountLocationId, setAccountLocationId] = useState<string | null>(null);
  const [role, setRole] = useState<CurrentAppUser['role']>(null);

  // Locations einmalig laden, danach Standort vorauswählen:
  // 1. Standort, der dem eingeloggten Account fest zugewiesen ist (app_users.location_id)
  //    -> Manager/Angestellte/Artist sind an eine Location geknüpft, Dropdown wird gesperrt
  // 2. sonst lokaler Browser-Favorit (nur Admin ohne feste Location)
  // 3. sonst die erste Location
  useEffect(() => {
    Promise.all([fetchLocations(), fetchCurrentAppUser()])
      .then(([data, appUser]) => {
        setLocations(data);
        setRole(appUser.role);
        const accountLocationId = appUser.location_id;
        const fav = localStorage.getItem(FAVORITE_LOCATION_KEY);
        const accountValid = accountLocationId && data.some((l) => l.id === accountLocationId);
        const favValid = fav && data.some((l) => l.id === fav);
        const initial = accountValid ? accountLocationId! : favValid ? fav! : data[0]?.id || '';
        setSelectedLocationId(initial);
        setIsLocationLocked(!!accountValid);
        setAccountLocationId(accountValid ? accountLocationId! : null);
      })
      .finally(() => setLocationsLoaded(true));
  }, []);

  function toggleFavorite() {
    if (favoriteLocationId === selectedLocationId) {
      localStorage.removeItem(FAVORITE_LOCATION_KEY);
      setFavoriteLocationId(null);
    } else {
      localStorage.setItem(FAVORITE_LOCATION_KEY, selectedLocationId);
      setFavoriteLocationId(selectedLocationId);
    }
  }

  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isEmployee = role === 'employee';
  const isArtist = role === 'artist';

  return (
    <LocationContext.Provider
      value={{
        locations,
        locationsLoaded,
        selectedLocationId,
        setSelectedLocationId,
        favoriteLocationId,
        toggleFavorite,
        isLocationLocked,
        accountLocationId,
        role,
        isAdmin,
        isManager,
        isEmployee,
        isArtist,
        canAccessBackoffice: isAdmin || isManager,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationContext muss innerhalb von <LocationProvider> verwendet werden.');
  return ctx;
}
