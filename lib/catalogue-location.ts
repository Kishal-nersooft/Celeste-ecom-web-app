export interface CatalogueStockQuery {
  /** False while a saved address or store is still loading, so lists do not render without stock. */
  ready: boolean;
  storeIds?: number[];
  latitude?: number;
  longitude?: number;
}

function finiteNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Stock for catalogue lists follows the active delivery address or pickup store.
 * Callers should wait until `ready` before fetching, and should not substitute other stores.
 */
export function catalogueStockQuery(input: {
  deliveryType: "pickup" | "delivery";
  isLocationLoading: boolean;
  defaultAddress?: { latitude?: unknown; longitude?: unknown } | null;
  selectedStore?: { id?: unknown } | null;
}): CatalogueStockQuery {
  const storeId =
    input.deliveryType === "pickup"
      ? finiteNumber(input.selectedStore?.id)
      : undefined;
  const latitude =
    input.deliveryType === "delivery"
      ? finiteNumber(input.defaultAddress?.latitude)
      : undefined;
  const longitude =
    input.deliveryType === "delivery"
      ? finiteNumber(input.defaultAddress?.longitude)
      : undefined;
  const hasStore = storeId != null;
  const hasCoords = latitude != null && longitude != null;

  if (input.isLocationLoading && !hasStore && !hasCoords) {
    return { ready: false };
  }

  if (hasStore) {
    return { ready: true, storeIds: [storeId] };
  }

  if (hasCoords) {
    return { ready: true, latitude, longitude };
  }

  return { ready: !input.isLocationLoading };
}
