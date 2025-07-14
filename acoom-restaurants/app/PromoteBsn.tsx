import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PromoteBsn = () => {
  const handlePromotionSelect = (plan: string) => {
    // adauga functionalitatae la selectarea planului
    alert(`Ai ales pachetul ${plan}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <ScrollView className="p-6">
        {/* Titlu */}
        <View className="items-center mb-8">
          <Text className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-300">
            Promovare Business
          </Text>
          <Text className="text-zinc-400 text-lg mt-2 text-center">
            Crește-ți vizibilitatea și atrage mai mulți clienți
          </Text>
        </View>

        {/* Beneficii */}
        <View className="bg-zinc-900/50 rounded-3xl p-6 mb-8 border border-zinc-800/50">
          <View className="flex-row items-center mb-4">
            <Ionicons name="megaphone" size={32} color="#A78BFA" />
            <Text className="text-2xl font-bold text-violet-300 ml-3">
              De ce să promovezi?
            </Text>
          </View>

          <View className="space-y-4">
            <View className="flex-row items-start">
              <Ionicons
                name="people"
                size={20}
                color="#C4B5FD"
                className="mt-1 mr-3"
              />
              <Text className="text-zinc-300 text-lg flex-1">
                Atrage clienți noi din zona ta
              </Text>
            </View>

            <View className="flex-row items-start">
              <Ionicons
                name="trending-up"
                size={20}
                color="#C4B5FD"
                className="mt-1 mr-3"
              />
              <Text className="text-zinc-300 text-lg flex-1">
                Crește vizibilitatea brandului tău
              </Text>
            </View>

            <View className="flex-row items-start">
              <Ionicons
                name="calendar"
                size={20}
                color="#C4B5FD"
                className="mt-1 mr-3"
              />
              <Text className="text-zinc-300 text-lg flex-1">
                Promovează evenimente speciale
              </Text>
            </View>

            <View className="flex-row items-start">
              <Ionicons
                name="analytics"
                size={20}
                color="#C4B5FD"
                className="mt-1 mr-3"
              />
              <Text className="text-zinc-300 text-lg flex-1">
                Acces la statistici detaliate
              </Text>
            </View>
          </View>
        </View>

        {/* Pachete */}
        <View className="space-y-6">
          {/* Pachet Simplu */}
          <TouchableOpacity
            onPress={() => handlePromotionSelect("Simplu")}
            className="bg-gradient-to-r from-violet-600 to-violet-800 rounded-2xl p-6 active:opacity-80"
          >
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <View className="flex-row items-center mb-2">
                  <FontAwesome5 name="star" size={20} color="white" />
                  <Text className="text-white text-xl font-bold ml-3">
                    Pachet Simplu
                  </Text>
                </View>
                <Text className="text-violet-200">7 zile promovare</Text>
              </View>
              <Text className="text-2xl font-bold text-white">49 RON</Text>
            </View>
          </TouchableOpacity>

          {/* Pachet Pro */}
          <TouchableOpacity
            onPress={() => handlePromotionSelect("Pro")}
            className="bg-gradient-to-r from-violet-700 to-violet-900 rounded-2xl p-6 active:opacity-80"
          >
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <View className="flex-row items-center mb-2">
                  <FontAwesome5 name="rocket" size={20} color="white" />
                  <Text className="text-white text-xl font-bold ml-3">
                    Pachet Pro
                  </Text>
                </View>
                <Text className="text-violet-200">30 zile promovare</Text>
                <Text className="text-violet-200 mt-1">
                  + Bonus vizibilitate
                </Text>
              </View>
              <Text className="text-2xl font-bold text-white">149 RON</Text>
            </View>
          </TouchableOpacity>

          {/* Pachet Ultra */}
          <TouchableOpacity
            onPress={() => handlePromotionSelect("Ultra")}
            className="bg-gradient-to-r from-violet-800 to-violet-950 rounded-2xl p-6 active:opacity-80"
          >
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <View className="flex-row items-center mb-2">
                  <FontAwesome5 name="crown" size={20} color="white" />
                  <Text className="text-white text-xl font-bold ml-3">
                    Pachet Ultra
                  </Text>
                </View>
                <Text className="text-violet-200">90 zile promovare</Text>
                <Text className="text-violet-200 mt-1">
                  + Prioritate maximă
                </Text>
              </View>
              <Text className="text-2xl font-bold text-white">399 RON</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Info suplimentar */}
        <View className="mt-8 p-4 bg-zinc-900/50 rounded-xl border border-dashed border-zinc-700">
          <Text className="text-zinc-400 text-center">
            * Toate pachetele includ promovare în aplicație și notificări push
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PromoteBsn;
