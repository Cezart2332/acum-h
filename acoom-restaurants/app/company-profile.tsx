import { Entypo, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BASE_URL from "../config.js";
import PromoteModal from "./promote-btn";

function openPhoneDialer(phoneNumber: string) {
  Linking.openURL(`tel:${phoneNumber}`).catch(() =>
    alert("Nu s-a putut deschide aplicația de telefon")
  );
}

type Company = {
  id: number;
  name: string;
  email: string;
  address: string;
  description: string;
  category: string;
  tags: string[];
  profileImage: string | null;
};

type Event = {
  id: number;
  title: string;
  photo: string;
};

type Reservation = {
  id: number;
  name: string;
  date: string;
  time: string;
  people: number;
};

export default function CompanyProfile() {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [uploading, setUploading] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [description, setDescription] = useState("");
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("company");
      if (!raw) return;

      const comp: Company = JSON.parse(raw);
      setCompany(comp);
      setDescription(comp.description);

      // fetch company events
      const form = new FormData();
      form.append("id", comp.id.toString());
      const resp = await fetch(`${BASE_URL}/companyevents`, {
        method: "POST",
        body: form,
      });
      if (resp.ok) {
        const data: Event[] = await resp.json();
        setEvents(data);

        // Start fade animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (company) {
        fetchEvents();
        fetchReservations();
      }
    }, [company])
  );

  const loadCompanyData = async () => {
    const raw = await AsyncStorage.getItem("company");
    if (!raw) return;

    const comp: Company = JSON.parse(raw);
    setCompany(comp);
    setDescription(comp.description);
    fetchEvents();
    fetchReservations();
  };

  const fetchEvents = async () => {
    if (!company) return;

    const form = new FormData();
    form.append("id", company.id.toString());
    try {
      const resp = await fetch(`${BASE_URL}/companyevents`, {
        method: "POST",
        body: form,
      });
      if (resp.ok) {
        const data: Event[] = await resp.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  };

  const fetchReservations = async () => {
    const mockReservations: Reservation[] = [
      {
        id: 1,
        name: "Andrei Popescu",
        date: "15 Iun",
        time: "19:30",
        people: 4,
      },
      {
        id: 2,
        name: "Maria Ionescu",
        date: "16 Iun",
        time: "20:00",
        people: 2,
      },
      {
        id: 3,
        name: "Cristian Moldovan",
        date: "17 Iun",
        time: "13:00",
        people: 6,
      },
    ];
    setReservations(mockReservations);
  };

  const pickAndUploadImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && company) {
      setUploading(true);
      const uri = result.assets[0].uri;
      const form = new FormData();
      form.append("id", company.id.toString());
      form.append("file", {
        uri,
        name: `profile_${company.id}.jpg`,
        type: "image/jpeg",
      } as any);

      try {
        const resp = await fetch(`${BASE_URL}/changepfp`, {
          method: "PUT",
          body: form,
        });
        if (resp.ok) {
          const b64 = await FileSystem.readAsStringAsync(uri, {
            encoding: "base64",
          });
          const updated = { ...company, profileImage: b64 };
          setCompany(updated);
          await AsyncStorage.setItem("company", JSON.stringify(updated));
        } else {
          Alert.alert("Eroare", "Nu s-a putut actualiza poza de profil.");
        }
      } catch {
        Alert.alert("Eroare", "A apărut o eroare la upload.");
      }
      setUploading(false);
    }
  };

  const logOut = async () => {
    await AsyncStorage.multiSet([
      ["loggedIn", "false"],
      ["company", "null"],
    ]);
    router.replace("/login");
  };

  if (!company) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#0F0817]">
        <ActivityIndicator size="large" color="#7c3aed" />
      </SafeAreaView>
    );
  }

  const phoneNumber = "+40722123456";

  return (
    <SafeAreaView className="flex-1 bg-[#0F0817]">
      <StatusBar style="light" />

      {/* Fluid Header with Gradient */}
      <Animated.View
        className="bg-gradient-to-b from-violet-900/90 to-violet-800/70 px-5 pb-6 pt-2 rounded-b-[40px]"
        style={{
          shadowColor: "#7C3AED",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          elevation: 15,
          opacity: fadeAnim,
        }}
      >
        <View className="flex-row justify-between items-center mb-5">
          <Text className="text-xl font-bold text-white">Profil Business</Text>
          <TouchableOpacity
            onPress={logOut}
            className="bg-violet-800/60 p-2 rounded-full"
          >
            <Ionicons name="log-out-outline" size={22} color="#d8b4fe" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={pickAndUploadImage}
            disabled={uploading}
            className="relative"
          >
            <View className="border-4 border-white/30 rounded-full p-1 shadow-2xl shadow-violet-900">
              {uploading ? (
                <View className="w-20 h-20 items-center justify-center bg-violet-900/30 rounded-full">
                  <ActivityIndicator size="small" color="#c084fc" />
                </View>
              ) : (
                <Image
                  source={
                    company.profileImage
                      ? { uri: `data:image/jpg;base64,${company.profileImage}` }
                      : require("./placeholder.jpg")
                  }
                  className="w-20 h-20 rounded-full bg-[#1A1A1A]"
                />
              )}
            </View>
            <View className="absolute bottom-1 right-1 bg-violet-600 p-1 rounded-full border border-white">
              <Ionicons name="camera" size={14} color="white" />
            </View>
          </TouchableOpacity>

          <View className="ml-4 flex-1">
            <Text className="text-xl font-bold text-white">{company.name}</Text>
            <Text className="text-violet-300 mt-1">{company.category}</Text>
            <View className="flex-row flex-wrap mt-2">
              {company.tags?.slice(0, 3).map((tag, index) => (
                <View
                  key={index}
                  className="bg-violet-900/50 px-2 py-1 rounded-full mr-2 mt-1"
                >
                  <Text className="text-violet-200 text-xs">{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Animated.View>

      <ScrollView className="flex-1 pt-4" showsVerticalScrollIndicator={false}>
        <View className="px-5 pb-10">
          {/* Quick Stats */}
          <View className="flex-row justify-between mb-6">
            <View className="bg-gradient-to-br from-violet-800/60 to-indigo-900/60 p-4 rounded-2xl flex-1 mr-3 shadow-lg shadow-violet-900/30">
              <View className="flex-row items-center">
                <Ionicons name="calendar" size={20} color="#d8b4fe" />
                <Text className="ml-2 text-violet-200 font-medium">
                  Evenimente
                </Text>
              </View>
              <Text className="text-center text-white text-2xl font-bold mt-2">
                {events.length}
              </Text>
            </View>
            <View className="bg-gradient-to-br from-violet-800/60 to-indigo-900/60 p-4 rounded-2xl flex-1 ml-3 shadow-lg shadow-violet-900/30">
              <View className="flex-row items-center">
                <Ionicons name="people" size={20} color="#d8b4fe" />
                <Text className="ml-2 text-violet-200 font-medium">
                  Rezervări
                </Text>
              </View>
              <Text className="text-center text-white text-2xl font-bold mt-2">
                {reservations.length}
              </Text>
            </View>
          </View>

          {/* Actions Grid */}
          <View className="flex-row flex-wrap justify-between mb-8">
            <TouchableOpacity
              onPress={() => router.push("/stats")}
              className="w-[48%] bg-gradient-to-br from-violet-800/50 to-indigo-900/50 rounded-2xl p-4 mb-4 items-center shadow-md shadow-violet-900/20"
            >
              <View className="bg-violet-700/30 p-3 rounded-full mb-3">
                <Ionicons name="stats-chart" size={24} color="#a78bfa" />
              </View>
              <Text className="text-violet-200 font-medium">Statistici</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/reservations")}
              className="w-[48%] bg-gradient-to-br from-violet-800/50 to-indigo-900/50 rounded-2xl p-4 mb-4 items-center shadow-md shadow-violet-900/20"
            >
              <View className="bg-violet-700/30 p-3 rounded-full mb-3">
                <Ionicons name="calendar" size={24} color="#a78bfa" />
              </View>
              <Text className="text-violet-200 font-medium">Rezervări</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/events/add")}
              className="w-[48%] bg-gradient-to-br from-violet-800/50 to-indigo-900/50 rounded-2xl p-4 items-center shadow-md shadow-violet-900/20"
            >
              <View className="bg-violet-700/30 p-3 rounded-full mb-3">
                <Ionicons name="add" size={24} color="#a78bfa" />
              </View>
              <Text className="text-violet-200 font-medium">Eveniment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/editMenu")}
              className="w-[48%] bg-gradient-to-br from-violet-800/50 to-indigo-900/50 rounded-2xl p-4 items-center shadow-md shadow-violet-900/20"
            >
              <View className="bg-violet-700/30 p-3 rounded-full mb-3">
                <Ionicons name="document-text" size={24} color="#a78bfa" />
              </View>
              <Text className="text-violet-200 font-medium">Meniu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/program")}
              className="w-[48%] bg-gradient-to-br from-violet-800/50 to-indigo-900/50 rounded-2xl p-4 items-center shadow-md shadow-violet-900/20"
            >
              <View className="bg-violet-700/30 p-3 rounded-full mb-3">
                <Ionicons name="time-outline" size={24} color="#a78bfa" />
              </View>
              <Text className="text-violet-200 font-medium">Program</Text>
            </TouchableOpacity>
          </View>

          {/* Rezervări */}
          <View className="bg-gradient-to-b from-violet-900/40 to-indigo-900/30 rounded-3xl p-5 mb-6 shadow-lg shadow-violet-900/20">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-violet-300">
                Rezervări recente
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/reservations")}
                className="flex-row items-center"
              >
                <Text className="text-violet-400 mr-1">Vezi toate</Text>
                <Ionicons name="arrow-forward" size={16} color="#a78bfa" />
              </TouchableOpacity>
            </View>

            <View className="space-y-3">
              {reservations.slice(0, 3).map((res) => (
                <View
                  key={res.id}
                  className="bg-gradient-to-r from-violet-800/50 to-indigo-900/40 p-4 rounded-2xl flex-row justify-between items-center"
                >
                  <View>
                    <Text className="text-white font-medium">{res.name}</Text>
                    <Text className="text-violet-300 text-sm mt-1">
                      {res.people} persoane
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-white font-semibold">{res.date}</Text>
                    <Text className="text-violet-300">{res.time}</Text>
                  </View>
                </View>
              ))}

              {reservations.length === 0 && (
                <View className="items-center py-6">
                  <Ionicons name="calendar-outline" size={40} color="#4B5563" />
                  <Text className="text-gray-500 mt-2">
                    Nicio rezervare înregistrată
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Despre noi */}
          <View className="bg-gradient-to-b from-violet-900/40 to-indigo-900/30 rounded-3xl p-5 mb-6 shadow-lg shadow-violet-900/20">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-violet-300">
                Despre noi
              </Text>
              <TouchableOpacity
                onPress={() => setIsEditingDesc(!isEditingDesc)}
                className="p-2 bg-violet-700/50 rounded-xl"
              >
                <Ionicons
                  name={isEditingDesc ? "checkmark" : "create-outline"}
                  size={20}
                  color="#c084fc"
                />
              </TouchableOpacity>
            </View>

            {isEditingDesc ? (
              <>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  className="text-white bg-violet-900/30 rounded-xl px-4 py-3 mb-4"
                  placeholder="Descrie afacerea ta..."
                  placeholderTextColor="#9ca3af"
                  style={{ minHeight: 100 }}
                />
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      const formData = new FormData();
                      formData.append("id", company.id.toString());
                      formData.append("description", description);

                      const response = await fetch(
                        `${BASE_URL}/updateCompanyDescription`,
                        {
                          method: "POST",
                          body: formData,
                        }
                      );

                      if (response.ok) {
                        const updatedCompany = { ...company, description };
                        setCompany(updatedCompany);
                        await AsyncStorage.setItem(
                          "company",
                          JSON.stringify(updatedCompany)
                        );
                        setIsEditingDesc(false);
                      } else {
                        Alert.alert(
                          "Eroare",
                          "Nu s-a putut actualiza descrierea"
                        );
                      }
                    } catch (error) {
                      Alert.alert("Eroare", "A apărut o problemă la conexiune");
                    }
                  }}
                  className="bg-gradient-to-r from-violet-600 to-indigo-700 px-5 py-3 rounded-xl self-end"
                >
                  <Text className="text-white font-semibold">Salvează</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text className="text-gray-300 leading-6">
                {company.description || "Adaugă o descriere a afacerii tale..."}
              </Text>
            )}
          </View>

          {/* Contact */}
          <View className="bg-gradient-to-b from-violet-900/40 to-indigo-900/30 rounded-3xl p-5 mb-6 shadow-lg shadow-violet-900/20">
            <Text className="text-lg font-bold text-violet-300 mb-4">
              Contact
            </Text>
            <View className="space-y-4">
              <View className="flex-row items-center">
                <View className="bg-violet-700/40 p-3 rounded-xl mr-3">
                  <Entypo name="location-pin" size={20} color="#c084fc" />
                </View>
                <Text className="text-gray-300 flex-1">{company.address}</Text>
              </View>

              <TouchableOpacity
                onPress={() => openPhoneDialer(phoneNumber)}
                className="flex-row items-center"
              >
                <View className="bg-violet-700/40 p-3 rounded-xl mr-3">
                  <Entypo name="phone" size={20} color="#c084fc" />
                </View>
                <Text className="text-violet-300">{phoneNumber}</Text>
              </TouchableOpacity>

              <View className="flex-row items-center">
                <View className="bg-violet-700/40 p-3 rounded-xl mr-3">
                  <Entypo name="mail" size={20} color="#c084fc" />
                </View>
                <Text className="text-gray-300 flex-1">{company.email}</Text>
              </View>
            </View>
          </View>

          {/* Evenimente */}
          <View className="bg-gradient-to-b from-violet-900/40 to-indigo-900/30 rounded-3xl p-5 mb-8 shadow-lg shadow-violet-900/20">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-lg font-bold text-violet-300">
                Evenimente ({events.length})
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/events/add")}
                className="p-3 bg-gradient-to-r from-violet-600 to-indigo-700 rounded-full"
              >
                <Ionicons name="add" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <View className="space-y-5">
              {events.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  onPress={() =>
                    router.push({
                      pathname: "/event/[id]",
                      params: { id: e.id.toString() },
                    })
                  }
                  className="bg-gradient-to-r from-violet-800/50 to-indigo-900/40 rounded-2xl overflow-hidden"
                >
                  <Image
                    source={
                      e.photo
                        ? { uri: `data:image/jpg;base64,${e.photo}` }
                        : require("./placeholder.jpg")
                    }
                    className="w-full h-40"
                  />

                  <View className="p-4">
                    <Text className="text-white text-lg font-semibold mb-1">
                      {e.title}
                    </Text>

                    <View className="flex-row justify-between items-center mt-3">
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            "Șterge eveniment",
                            `Ești sigur că vrei să ștergi „${e.title}”?`,
                            [
                              { text: "Anulează", style: "cancel" },
                              {
                                text: "Șterge",
                                style: "destructive",
                                onPress: async () => {
                                  try {
                                    const formData = new FormData();
                                    formData.append("eventId", e.id.toString());

                                    const response = await fetch(
                                      `${BASE_URL}/deleteEvent`,
                                      {
                                        method: "DELETE",
                                        body: formData,
                                      }
                                    );

                                    if (response.ok) {
                                      setEvents(
                                        events.filter(
                                          (event) => event.id !== e.id
                                        )
                                      );
                                    } else {
                                      Alert.alert(
                                        "Eroare",
                                        "Nu s-a putut șterge evenimentul"
                                      );
                                    }
                                  } catch (error) {
                                    Alert.alert(
                                      "Eroare",
                                      "A apărut o problemă la conexiune"
                                    );
                                  }
                                },
                              },
                            ]
                          );
                        }}
                        className="p-2"
                      >
                        <Ionicons
                          name="trash-outline"
                          size={22}
                          color="#ef4444"
                        />
                      </TouchableOpacity>

                      <TouchableOpacity className="flex-row items-center bg-violet-700/30 px-3 py-2 rounded-full">
                        <Text className="text-violet-200 mr-1">Detalii</Text>
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color="#a78bfa"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {events.length === 0 && (
                <TouchableOpacity
                  className="items-center py-8 border-2 border-dashed border-violet-700/50 rounded-2xl"
                  onPress={() => router.push("/events/add")}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={40}
                    color="#7c3aed"
                  />
                  <Text className="text-violet-400 mt-2 font-medium">
                    Adaugă primul eveniment
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Promotion */}
          <View className="bg-gradient-to-r from-violet-700 to-indigo-800 rounded-3xl p-5 mb-8 shadow-lg shadow-indigo-900/40">
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-white font-bold text-lg mb-1">
                  Promovează afacerea
                </Text>
                <Text className="text-violet-200 text-sm">
                  Crește-ți vizibilitatea în aplicație
                </Text>
              </View>
              <PromoteModal />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
