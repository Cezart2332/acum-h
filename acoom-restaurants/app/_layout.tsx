import { Stack } from "expo-router";
import { EventProvider } from "../lib/EventContext";
import "./globals.css";

export default function RootLayout() {
  return (
    <EventProvider>
      <Stack />
    </EventProvider>
  );
}
