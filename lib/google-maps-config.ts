export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";

export const GOOGLE_MAPS_LIBRARIES: (
  | "places"
  | "drawing"
  | "geometry"
  | "visualization"
)[] = ["places"];

export const GOOGLE_MAPS_SCRIPT_ID = "google-maps-script";
