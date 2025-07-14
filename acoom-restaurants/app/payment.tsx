// app/payment.tsx
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PaymentPage = () => {
  //const { events } = useLocalSearchParams();
  // const selectedEvents = events ? JSON.parse(events as string) : []; //trb sa rezolv asta

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const handlePayment = () => {
    if (cardNumber && expiry && cvv) {
      Alert.alert("Succes", "Plata a fost efectuată cu succes!");
      // trimitere catre backend
    } else {
      Alert.alert("Eroare", "Te rugăm să completezi toate câmpurile.");
    }
  };

  return (
    <ScrollView className="flex-1 bg-white px-4 py-6">
      <Text className="text-3xl font-bold text-center mb-6 text-orange-600">
        Plată cu cardul
      </Text>

      <View className="mb-6">
        <Text className="text-xl font-semibold mb-2">
          Evenimente selectate:
        </Text>
      </View>

      <Text className="text-lg font-semibold mb-1">Număr card</Text>
      <TextInput
        value={cardNumber}
        onChangeText={setCardNumber}
        keyboardType="numeric"
        maxLength={16}
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
        placeholder="1234 5678 9012 3456"
      />

      <View className="flex-row justify-between mb-4">
        <View className="flex-1 mr-2">
          <Text className="text-lg font-semibold mb-1">Expiră</Text>
          <TextInput
            value={expiry}
            onChangeText={setExpiry}
            placeholder="MM/AA"
            className="border border-gray-300 rounded-lg px-4 py-3"
          />
        </View>
        <View className="flex-1 ml-2">
          <Text className="text-lg font-semibold mb-1">CVV</Text>
          <TextInput
            value={cvv}
            onChangeText={setCvv}
            placeholder="123"
            keyboardType="numeric"
            maxLength={3}
            className="border border-gray-300 rounded-lg px-4 py-3"
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={handlePayment}
        className="bg-orange-500 rounded-xl py-4 mt-6 items-center active:opacity-80"
      >
        <Text className="text-white font-bold text-lg">Confirmă plata</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default PaymentPage;
