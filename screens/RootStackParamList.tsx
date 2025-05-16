interface EventData {
  id: string;
  title: string;
  description?: string;
  photo: any; 
}

export type RootStackParamList = { Login: undefined; Register: undefined; Home: undefined;CompanyReg:undefined;Profile:undefined;  EventScreen: { event: EventData; isCompany: boolean }; };