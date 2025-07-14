import BASE_URL from "@/config";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AddEventScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string>("0");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("company");
      if (raw) {
        const comp = JSON.parse(raw);
        setCompanyId(comp.id.toString());
      }
    })();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permisiunea este necesară pentru a accesa galeria.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const onAddTag = () => {
    if (tagInput.trim()) {
      setTags((prev) => [...prev, tagInput.trim()]);
      setTagInput("");
    }
  };

  const onSave = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Eroare", "Te rog să completezi titlu și descriere.");
      return;
    }
    const form = new FormData();
    form.append("title", title);
    form.append("description", description);
    form.append("tags", tags.join(","));
    form.append("companyId", companyId);
    if (imageUri) {
      form.append("file", {
        uri: imageUri,
        name: `event_${Date.now()}.jpg`,
        type: "image/jpeg",
      } as any);
    }
    try {
      const resp = await fetch(`${BASE_URL}/events`, {
        method: "POST",
        body: form,
      });
      if (resp.ok) {
        router.back();
        return;
      }
      Alert.alert("Eroare", "Nu s-a putut salva evenimentul.");
    } catch (error) {
      console.error("Network error:", error);
      Alert.alert("Eroare", "A apărut o eroare de rețea.");
    }
  };

  const inputStyles = (field: string) => ({
    borderColor: focusedField === field ? "#7F1DFF" : "#D1D5DB",
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 80}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 200 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-2xl font-bold mb-6 text-gray-800">
          Adaugă eveniment
        </Text>

        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            className="w-full h-48 rounded-lg mb-4"
          />
        )}

        <TouchableOpacity
          onPress={pickImage}
          className="bg-purple-600 py-3 px-4 rounded-lg mb-6 items-center"
        >
          <Text className="text-white font-semibold">Alege imagine</Text>
        </TouchableOpacity>

        <Text className="font-semibold mb-2 text-gray-700">Titlu</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Titlu eveniment"
          onFocus={() => setFocusedField("title")}
          onBlur={() => setFocusedField(null)}
          style={inputStyles("title")}
        />

        <Text className="font-semibold mb-2 text-gray-700">Descriere</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Descriere eveniment"
          multiline
          onFocus={() => setFocusedField("description")}
          onBlur={() => setFocusedField(null)}
          style={{ ...inputStyles("description"), height: 100 }}
        />

        <Text className="font-semibold mb-2 text-gray-700">Tag-uri</Text>
        <View className="flex-row mb-4">
          <TextInput
            value={tagInput}
            onChangeText={setTagInput}
            placeholder="Adaugă tag"
            onFocus={() => setFocusedField("tag")}
            onBlur={() => setFocusedField(null)}
            style={{
              ...inputStyles("tag"),
              flex: 1,
              marginBottom: 0,
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
            }}
          />
          <TouchableOpacity
            onPress={onAddTag}
            className="bg-purple-600 px-4 justify-center rounded-r-md"
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View className="flex-row flex-wrap mb-6">
          {tags.map((t, i) => (
            <View
              key={i}
              className="bg-purple-100 px-3 py-1 mr-2 mb-2 rounded-full"
            >
              <Text className="text-purple-800">{t}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={onSave}
          className="bg-orange-500 rounded-lg py-3 items-center"
        >
          <Text className="text-white font-semibold">Salvează</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 items-center"
        >
          <Text className="text-gray-600">Anulează</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
