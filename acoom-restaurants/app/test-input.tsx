import React, { useState } from "react";
import { View, Text, TextInput } from "react-native";
import SafeAreaView from "@/lib/components/SafeAreaView";
import { LinearGradient } from "expo-linear-gradient";

export default function TestInputScreen() {
  console.log("TestInputScreen rendered");

  const [text, setText] = useState("");

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient
        colors={["#000000", "#0F0F0F"]}
        style={{ flex: 1, padding: 20 }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 18, marginBottom: 20 }}>
          Test Input Screen
        </Text>
        <TextInput
          style={{
            backgroundColor: "#1F2937",
            borderRadius: 12,
            padding: 16,
            color: "#FFFFFF",
            fontSize: 16,
            borderWidth: 1,
            borderColor: "#374151",
          }}
          placeholder="Type here to test"
          placeholderTextColor="#6B7280"
          value={text}
          onChangeText={setText}
        />
        <Text style={{ color: "#FFFFFF", marginTop: 20 }}>
          Current value: {text}
        </Text>
      </LinearGradient>
    </SafeAreaView>
  );
}
