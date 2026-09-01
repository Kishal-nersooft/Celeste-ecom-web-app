export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";

export const GOOGLE_MAPS_LIBRARIES: (
  | "places"
  | "drawing"
  | "geometry"
  | "visualization"
)[] = ["places"];

export const GOOGLE_MAPS_SCRIPT_ID = "google-maps-script";

/** Geographic center of Sri Lanka — default picker view. */
export const SRI_LANKA_MAP_CENTER = { lat: 7.8731, lng: 80.7718 };

/** Country-level zoom so the whole island is visible in the picker. */
export const SRI_LANKA_MAP_ZOOM = 7;

export const SRI_LANKA_MAP_BOUNDS = {
  north: 9.85,
  south: 5.92,
  east: 81.88,
  west: 79.65,
};

export function fitMapToSriLanka(map: google.maps.Map) {
  map.fitBounds(SRI_LANKA_MAP_BOUNDS, 24);
}
