import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchLocations, fetchCurrentUserLocationId, type Location } from './queries';

const FAVORITE_LOCATION_KEY = 'skinproject:favoriteLocationId';

interface LocationContextValue {
  locations: Location[];
  locationsLoaded: boolean;
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
  favoriteLocationId: string | null;
  toggleFavorite: () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [favoriteLocationId, setFavoriteLocationId] = useState<string | null>(() => localStorage.getItem(FAVORITE_LOCATION_KEY));

  // Locations einmalig laden, danach Standort vorauswählen:
  // 1. Standort, der dem eingeloggten Account zugewiesen ist (app_users.location_id) — hat Vorrang
  // 2. sonst lokaler Browser-Favorit
  // 3. sonst die erste Location
  useEffect(() => {
    Promise.all([fetchLocations(), fetchCurrentUserLocationId()])
      .then(([data, accountLocationId]) => {
        setLocations(data);
        const fav = localStorage.getItem(FAVORITE_LOCATION_KEY);
        const accountValid = accountLocationId && data.some((l) => l.id === accountLocationId);
        const favValid = fav && data.some((l) => l.id === fav);
        const initial = accountValid ? accountLocationId! : favValid ? fav! : data[0]?.id || '';
        setSelectedLocationId(initial);
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

  return (
    <LocationContext.Provider value={{ locations, locationsLoaded, selectedLocationId, setSelectedLocationId, favoriteLocationId, toggleFavorite }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationContext muss innerhalb von <LocationProvider> verwendet werden.');
  return ctx;
}
