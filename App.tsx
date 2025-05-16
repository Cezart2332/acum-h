import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeTabs from './screens/HomeTabs';
import CompanyRegister from './screens/CompanyRegister';
import Profile from './screens/Profile';
import EventScreen from './screens/EventScreen';
import { RootStackParamList } from './screens/RootStackParamList';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const getLogIn = await AsyncStorage.getItem('loggedIn');
      setIsLoggedIn(getLogIn != null ? JSON.parse(getLogIn) : false);
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={isLoggedIn ? 'Home' : 'Login'} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Home" component={HomeTabs} />
          <Stack.Screen name="CompanyReg" component={CompanyRegister} />
          <Stack.Screen name="Profile" component={Profile} />
          <Stack.Screen name="EventScreen" component={EventScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
