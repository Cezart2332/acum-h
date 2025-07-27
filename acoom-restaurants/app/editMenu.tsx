import BASE_URL from "@/config";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function EditMenu() {
  const [uploading, setUploading] = useState(false);

  const requestStoragePermission = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: "Permisiune acces stocare",
          message: "Avem nevoie de acces la fișiere pentru a încărca meniul",
          buttonPositive: "OK",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const pickAndUploadPDF = async () => {
    try {
      const hasPerm = await requestStoragePermission();
      if (!hasPerm) return;

      const companyData = await AsyncStorage.getItem("company");
      if (!companyData) throw new Error("Company data not found");

      const company = JSON.parse(companyData);
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: false,
      });

      if (res.canceled || !res.assets[0]) return;

      const { uri, name, mimeType } = res.assets[0];
      setUploading(true);

      const formData = new FormData();
      formData.append("file", {
        uri,
        name,
        type: mimeType,
      } as any);

      const response = await fetch(
        `${BASE_URL}/companies/${company.id}/upload-menu`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) throw new Error(await response.text());

      // Update local company data
      const updatedCompany = {
        ...company,
        menuName: name,
        menuData: "exists", // Presupunem că există date după upload
      };
      await AsyncStorage.setItem("company", JSON.stringify(updatedCompany));

      Alert.alert("Succes", "Meniul a fost încărcat cu succes!");
    } catch (err) {
      const errorMessage =
        err && typeof err === "object" && "message" in err
          ? (err as { message?: string }).message
          : "A apărut o eroare la upload";
      Alert.alert("Eroare", errorMessage || "A apărut o eroare la upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View className="flex-1 bg-zinc-950 p-6 justify-center">
      <View className="bg-zinc-900/80 rounded-3xl p-8 border-2 border-zinc-800/50">
        <View className="items-center mb-8">
          <Ionicons
            name="restaurant"
            size={48}
            color="#A78BFA"
            className="mb-4"
          />
          <Text className="text-2xl font-bold text-violet-300">
            Actualizează Meniul
          </Text>
          <Text className="text-zinc-400 text-center mt-2">
            Încarcă cel mai recent meniu în format PDF
          </Text>
        </View>

        <TouchableOpacity
          onPress={pickAndUploadPDF}
          className="bg-violet-600 rounded-2xl p-6 flex-row items-center justify-center active:bg-violet-700"
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={24} color="white" />
              <Text className="ml-3 text-white font-semibold text-lg">
                Selectează PDF
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View className="mt-6 flex-row items-center justify-center">
          <Ionicons name="information-circle" size={18} color="#A78BFA" />
          <Text className="ml-2 text-zinc-400 text-sm">
            Format acceptat: PDF • Max 10MB
          </Text>
        </View>
      </View>
    </View>
  );
}
