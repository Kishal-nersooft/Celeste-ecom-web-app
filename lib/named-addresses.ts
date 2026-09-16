type AddressWithName = {
  id: number;
  name?: string;
};

export type AddressSlot = "home" | "work" | "other";

function readStoredAddressNames(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = JSON.parse(localStorage.getItem("addressNames") || "{}");
    return stored && typeof stored === "object" ? stored : {};
  } catch {
    return {};
  }
}

function writeStoredAddressNames(names: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem("addressNames", JSON.stringify(names));
}

export function attachStoredAddressNames<T extends AddressWithName>(addresses: T[]): T[] {
  const storedNames = readStoredAddressNames();
  return addresses.map((addr) => {
    const storedName = storedNames[addr.id];
    if (!addr.name && storedName) {
      return { ...addr, name: storedName };
    }
    return addr;
  });
}

export function isNamedSavedAddress(addr: { name?: string }) {
  return typeof addr.name === "string" && addr.name.trim().length > 0;
}

export function getNamedSavedAddresses<T extends AddressWithName>(addresses: T[]): T[] {
  return attachStoredAddressNames(addresses).filter(isNamedSavedAddress);
}

export function rememberAddressName(id: number, name: string) {
  const stored = readStoredAddressNames();
  stored[id] = name;
  writeStoredAddressNames(stored);
}

export function forgetAddressName(id: number) {
  const stored = readStoredAddressNames();
  delete stored[id];
  writeStoredAddressNames(stored);
}

export function classifyAddressName(name?: string): AddressSlot {
  const normalized = name?.trim().toLowerCase() ?? "";
  if (normalized === "home" || normalized === "house") return "home";
  if (normalized === "work" || normalized === "office") return "work";
  return "other";
}

export function findSlotAddress<T extends AddressWithName>(addresses: T[], slot: "home" | "work") {
  return addresses.find((addr) => classifyAddressName(addr.name) === slot);
}

export function getOtherNamedAddresses<T extends AddressWithName>(
  addresses: T[],
  home?: T,
  work?: T
) {
  return addresses.filter((addr) => addr.id !== home?.id && addr.id !== work?.id);
}
