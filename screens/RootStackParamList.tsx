export interface EventData {
  id: number;
  title: string;
  description?: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  address: string;
  city: string;
  photo: string;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  companyId: number;
  tags?: string[];
  company?: string;
  likes?: number;
}

export interface LocationData {
  id: number;
  name: string;
  address: string;
  phoneNumber?: string;
  latitude: number;
  longitude: number;
  tags: string[];
  photo: string;
  menuName: string;
  hasMenu: boolean;
  category: string;
  company: {
    id: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CompanyData {
  id?: number;
  name?: string;
  email?: string;
  address?: string;
  cui?: number;
  category?: string;
  profileImage?: string;
  description?: string;
  tags?: string[];
  latitude?: number;
  longitude?: number;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  CompanyReg: undefined;
  Profile: undefined;
  Map: undefined;
  EventScreen: { event: EventData };
  Info: { location: LocationData };
  Reservation: { location: LocationData };
  Schedule: { location: LocationData };
  ReservationsHistory: undefined;
};
