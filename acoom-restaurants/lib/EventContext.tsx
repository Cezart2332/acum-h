// EventContext.tsx
import React, { createContext, useContext, useState } from "react";
import { events as initialEvents } from "./_events";

export type Event = {
  id: string;
  title: string;
  date: string;
  location: string;
  image?: string | null;
};

type EventContextType = {
  events: Event[];
  addEvent: (event: Event) => void;
  removeEvent: (id: string) => void; // ← nou
};

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider = ({ children }: { children: React.ReactNode }) => {
  const [events, setEvents] = useState<Event[]>(initialEvents);

  const addEvent = (event: Event) => {
    setEvents((prev) => [...prev, event]);
  };

  const removeEvent = (id: string) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
  };

  return (
    <EventContext.Provider value={{ events, addEvent, removeEvent }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvents = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEvents must be used within an EventProvider");
  }
  return context;
};
