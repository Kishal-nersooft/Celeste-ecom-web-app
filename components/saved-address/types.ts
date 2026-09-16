export type SavedAddress = {
  id: number;
  address: string;
  latitude: number;
  longitude: number;
  name?: string;
  is_default?: boolean;
  ondemand_delivery_available?: boolean;
};

export type SavedAddStep = "search" | "map" | "confirm";
