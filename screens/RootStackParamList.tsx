export interface EventData {
  id: string;
  title: string;
  description?: string;
  photo: string;
  tags?: string[];
  company?: string;
  likes?: number;
}

export interface LocationData {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  tags: string[];
  photo: string;
  menuName: string;
  hasMenu: boolean;
  company: {
    id: number;
    name: string;
    category: string;
    description: string;
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
