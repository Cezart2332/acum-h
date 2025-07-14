import "react-native-gesture-handler";
import { enableScreens } from "react-native-screens";
enableScreens();
import React, { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-get-random-values";

import { ThemeProvider } from "./context/ThemeContext";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import HomeTabs from "./screens/HomeTabs";
import Profile from "./screens/Profile";
import EventScreen from "./screens/EventScreen";
import Info from "./screens/Info";
import Reservation from "./screens/Reservation";
import { RootStackParamList } from "./screens/RootStackParamList";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const getLogIn = await AsyncStorage.getItem("loggedIn");
      setIsLoggedIn(getLogIn != null ? JSON.parse(getLogIn) : false);
    })();
  }, []);

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            id={undefined}
            initialRouteName={isLoggedIn ? "Home" : "Login"}
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Home" component={HomeTabs} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="EventScreen" component={EventScreen} />
            <Stack.Screen name="Info" component={Info} />
            <Stack.Screen name="Reservation" component={Reservation} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
