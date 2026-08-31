import { Store } from "@/types/store";

function getSavedAddressName(defaultAddress: { id?: number | string; name?: string } | null): string | null {
  if (!defaultAddress) return null;
  if (defaultAddress.name) return defaultAddress.name;

  if (typeof window !== "undefined" && defaultAddress.id != null) {
    try {
      const storedNames = JSON.parse(localStorage.getItem("addressNames") || "{}");
      const name = storedNames[defaultAddress.id];
      if (typeof name === "string" && name.trim()) return name.trim();
    } catch {
      // ignore parse errors
    }
  }

  return null;
}

function shortenAddress(address: string, maxLength = 28): string {
  const firstPart = address.split(",")[0].trim();
  if (!firstPart) return address;
  if (firstPart.length <= maxLength) return firstPart;
  return `${firstPart.slice(0, maxLength - 3)}...`;
}

export function formatLocationLabel(
  selectedLocation: string,
  options?: {
    defaultAddress?: { id?: number | string; name?: string; address?: string } | null;
    selectedStore?: Store | null;
    deliveryType?: "pickup" | "delivery";
    maxLength?: number;
  }
): string {
  if (!selectedLocation || selectedLocation === "Location") {
    return "Location";
  }

  if (options?.deliveryType === "pickup" && options.selectedStore?.name) {
    return options.selectedStore.name;
  }

  const savedName = getSavedAddressName(options?.defaultAddress ?? null);
  if (savedName) return savedName;

  if (/^Lat:\s*[\d.-]+,\s*Lng:\s*[\d.-]+/.test(selectedLocation)) {
    return "Current Location";
  }

  return shortenAddress(selectedLocation, options?.maxLength);
}
