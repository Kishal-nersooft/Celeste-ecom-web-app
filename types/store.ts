export interface Store {
  id: string;
  name: string;
  description?: string;
  address: string;
  phone?: string;
  email?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
