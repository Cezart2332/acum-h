import BASE_URL from "@/config";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Event {
  id: number;
  title: string;
  photo: string;
  date?: string;
  company: string;
}

const PromoteEvent = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch company events
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const companyData = await AsyncStorage.getItem("company");
        if (!companyData) throw new Error("Company data not found");

        const company = JSON.parse(companyData);
        if (!company?.id) throw new Error("Company ID not found");

        const formData = new FormData();
        formData.append("id", company.id.toString());

        const response = await fetch(`${BASE_URL}/companyevents`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Failed to fetch events");

        const data: Event[] = await response.json();
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds((prev) =>
      prev.length === events.length ? [] : events.map((e) => e.id.toString())
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-950 items-center justify-center">
        <ActivityIndicator size="large" color="#7c3aed" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-950 items-center justify-center">
        <Text className="text-red-400 text-lg">{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <ScrollView className="p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-300">
            Promovează Evenimente
          </Text>
          <Text className="text-zinc-400 mt-2">
            Selectează evenimentele pe care vrei să le promovezi
          </Text>
        </View>

        {/* Select All Button */}
        <TouchableOpacity
          onPress={selectAll}
          className="bg-violet-600 p-4 rounded-2xl mb-6 active:bg-violet-700"
        >
          <Text className="text-white font-semibold text-center">
            {selectedIds.length === events.length
              ? "Deselectează toate"
              : "Selectează toate"}
          </Text>
        </TouchableOpacity>

        {/* Events List */}
        <View className="space-y-4">
          {events.map((event) => (
            <TouchableOpacity
              key={event.id}
              onPress={() => toggleSelect(event.id.toString())}
              className={`rounded-2xl overflow-hidden border-2 ${
                selectedIds.includes(event.id.toString())
                  ? "border-violet-400"
                  : "border-zinc-700"
              }`}
            >
              <ImageBackground
                source={{
                  uri: event.photo
                    ? `data:image/jpg;base64,${event.photo}`
                    : require("./placeholder.jpg"),
                }}
                className="h-48 justify-end"
                imageStyle={{ opacity: 0.8 }}
              >
                {/* Overlay */}
                <View className="bg-black/50 p-4">
                  <Text className="text-white text-xl font-bold">
                    {event.title}
                  </Text>
                  <Text className="text-violet-200 mt-1">
                    {event.date || "Data nedefinită"} • {event.company}
                  </Text>
                </View>

                {/* Check Indicator */}
                {selectedIds.includes(event.id.toString()) && (
                  <View className="absolute top-3 right-3 bg-violet-600 p-2 rounded-full">
                    <Ionicons name="checkmark" size={20} color="white" />
                  </View>
                )}
              </ImageBackground>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Payment Footer */}
      {selectedIds.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-violet-600 p-6">
          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: "/payment",
                params: {
                  events: selectedIds.join(","),
                  type: "events",
                },
              });
            }}
            className="bg-violet-800 p-4 rounded-2xl active:bg-violet-900"
          >
            <Text className="text-white font-bold text-center text-lg">
              Continuă la plată ({selectedIds.length} eveniment
              {selectedIds.length > 1 ? "e" : ""})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default PromoteEvent;
