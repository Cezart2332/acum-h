import BASE_URL from "@/config";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  Text,
  View,
} from "react-native";

type EventResponse = {
  id: number;
  photo: string;
  title: string;
  tags: string[];
  description: string;
  likes: number;
  company: string;
};

export default function EventScreen() {
  const { id } = useLocalSearchParams();
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`${BASE_URL}/events/${id}`);

        if (response.ok) {
          const data: EventResponse = await response.json();
          setEvent(data);
        } else {
          console.error("Failed to fetch event");
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950">
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950">
        <Text className="text-white">Event not found</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-zinc-950">
      {/* Banner Image */}
      <ImageBackground
        source={{ uri: `data:image/jpg;base64,${event.photo}` }}
        className="h-72"
      >
        <View className="absolute inset-0 bg-black/30" />
      </ImageBackground>

      {/* Event Content */}
      <View className="p-5">
        {/* Title and Likes */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-violet-300">
            {event.title}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="heart" size={20} color="#ef4444" />
            <Text className="text-zinc-300 ml-1">{event.likes}</Text>
          </View>
        </View>

        {/* Tags */}
        <View className="flex-row flex-wrap mb-4">
          {event.tags.map((tag, index) => (
            <View
              key={index}
              className="bg-violet-900/40 px-3 py-1 mr-2 mb-2 rounded-full"
            >
              <Text className="text-violet-300 text-sm">{tag}</Text>
            </View>
          ))}
        </View>

        {/* Description */}
        <Text className="text-zinc-300 text-base leading-6 mb-6">
          {event.description}
        </Text>

        {/* Company */}
        <View className="bg-zinc-900/50 p-4 rounded-xl">
          <Text className="text-violet-400 text-sm mb-1">Organized by</Text>
          <Text className="text-zinc-300 text-lg">{event.company}</Text>
        </View>
      </View>
    </ScrollView>
  );
}
