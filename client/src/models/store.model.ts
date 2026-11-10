export interface StoreLocation {
  id: number;
  name: string;
  address: string;
  province: string;
  district?: string | null;
  phoneNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openHours?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreLocationRequest {
  name: string;
  address: string;
  province: string;
  district?: string;
  phoneNumber?: string;
  latitude?: number;
  longitude?: number;
  openHours?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

