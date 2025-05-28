import React, { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "./HomeScreen";
import SearchScreen from "./SearchScreen";
import SettingsScreen from "./SettingsScreen";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import MapsScreen from "./MapsScreen";

const Tab = createBottomTabNavigator();

export default function HomeTabs() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            const icons: any = {
              Main: "home-outline",
              Search: "search-outline",
              Settings: "settings-outline",
              Add: "add-circle-outline",
              Map: "map-outline",
            };
            return (
              <Ionicons name={icons[route.name]} size={size} color={color} />
            );
          },
          tabBarActiveTintColor: "#2a5298",
          tabBarInactiveTintColor: "gray",
          headerShown: false,
          tabBarStyle: {
            height: 40 + insets.bottom,
            paddingBottom: insets.bottom,
            backgroundColor: "#fff",
            borderTopColor: "#fff",
          },
        })}
      >
        <Tab.Screen name="Main" component={HomeScreen} />
        <Tab.Screen name="Search" component={SearchScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
        <Tab.Screen name="Map" component={MapsScreen} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}
