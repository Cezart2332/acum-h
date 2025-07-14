export interface EventData {
  id: string;
  title: string;
  description?: string;
  photo: string;
  tags?: string[];
  company?: string;
  likes?: number;
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
  Info: { company: CompanyData };
  Reservation: { company: CompanyData };
};
