// Simple in-memory storage for mock data
// In a real app, this would be a database

interface Address {
  id: number;
  address: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_delivery: boolean;
  created_at: string;
  updated_at: string;
}

// In-memory storage
let addresses: Address[] = [
  {
    id: 1,
    address: "123 Main St, New York, NY 10001",
    latitude: 40.7128,
    longitude: -74.006,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

let users: User[] = [
  {
    id: "zV3X1A9fDlYxctYk8U9DeDQIcVr1",
    name: "Test User",
    email: "test@example.com",
    phone: "+16505557777",
    is_delivery: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Address functions
export const mockAddressStorage = {
  getAll: (): Address[] => [...addresses],
  
  getById: (id: number): Address | undefined => 
    addresses.find(addr => addr.id === id),
  
  add: (addressData: Omit<Address, 'id' | 'created_at' | 'updated_at'>): Address => {
    const newAddress: Address = {
      id: Math.max(...addresses.map(a => a.id), 0) + 1,
      ...addressData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    addresses.push(newAddress);
    return newAddress;
  },
  
  update: (id: number, updates: Partial<Omit<Address, 'id' | 'created_at' | 'updated_at'>>): Address | null => {
    const index = addresses.findIndex(addr => addr.id === id);
    if (index === -1) return null;
    
    addresses[index] = {
      ...addresses[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return addresses[index];
  },
  
  delete: (id: number): boolean => {
    const index = addresses.findIndex(addr => addr.id === id);
    if (index === -1) return false;
    addresses.splice(index, 1);
    return true;
  },
  
  setDefault: (id: number): Address | null => {
    // First, set all addresses to not default
    addresses.forEach(addr => addr.is_default = false);
    
    // Then set the specified address as default
    const address = addresses.find(addr => addr.id === id);
    if (address) {
      address.is_default = true;
      address.updated_at = new Date().toISOString();
      return address;
    }
    return null;
  }
};

// User functions
export const mockUserStorage = {
  getById: (id: string): User | undefined => 
    users.find(user => user.id === id),
  
  update: (id: string, updates: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>): User | null => {
    const index = users.findIndex(user => user.id === id);
    if (index === -1) return null;
    
    users[index] = {
      ...users[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return users[index];
  },
  
  add: (userData: Omit<User, 'created_at' | 'updated_at'>): User => {
    const newUser: User = {
      ...userData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    users.push(newUser);
    return newUser;
  }
};
