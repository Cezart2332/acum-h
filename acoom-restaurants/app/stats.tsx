import React from "react";
import {
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { BarChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

export default function CompanyStatsScreen() {
  const stats = {
    views: 12430,
    directions: 852,
    uniqueVisitors: 5620,
    participants: 430,
    averageRating: 4.6,
    promotedViews: 3120,
  };

  const trafficData = {
    labels: ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"],
    datasets: [
      {
        data: [2200, 1900, 2600, 1800, 2900, 3200, 2700],
      },
    ],
  };

  return (
    <SafeAreaView className="flex-1 font-sans">
      <Image
        className="h-full w-full absolute"
        source={require("./assets/images/login-bg.jpeg")}
      />
      <ScrollView className="flex-1 bg-transparent p-6">
        <Text className="text-2xl font-bold mb-4">Statistici Companie</Text>

        <View className="bg-gray-100 rounded-2xl p-4 mb-4 shadow">
          <Text className="text-lg font-semibold">Afișări profil</Text>
          <Text className="text-2xl">{stats.views}</Text>
        </View>

        <View className="bg-gray-100 rounded-2xl p-4 mb-4 shadow">
          <Text className="text-lg font-semibold">Clicuri pe „Direcții”</Text>
          <Text className="text-2xl">{stats.directions}</Text>
        </View>

        <View className="bg-gray-100 rounded-2xl p-4 mb-4 shadow">
          <Text className="text-lg font-semibold">Vizitatori unici</Text>
          <Text className="text-2xl">{stats.uniqueVisitors}</Text>
        </View>

        <View className="bg-gray-100 rounded-2xl p-4 mb-4 shadow">
          <Text className="text-lg font-semibold">
            Participanți la evenimente
          </Text>
          <Text className="text-2xl">{stats.participants}</Text>
        </View>

        <View className="bg-gray-100 rounded-2xl p-4 mb-4 shadow">
          <Text className="text-lg font-semibold">Rating mediu</Text>
          <Text className="text-2xl">⭐ {stats.averageRating} / 5</Text>
        </View>

        <View className="bg-gray-100 rounded-2xl p-4 mb-4 shadow">
          <Text className="text-lg font-semibold">Afișări promovate</Text>
          <Text className="text-2xl">{stats.promotedViews}</Text>
        </View>

        <Text className="text-xl font-semibold mt-6 mb-2">Trafic zilnic</Text>
        <BarChart
          data={trafficData}
          width={screenWidth - 32}
          height={220}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: "#ffffff",
            backgroundGradientFrom: "#f3f4f6",
            backgroundGradientTo: "#f3f4f6",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(30, 64, 175, ${opacity})`,
            labelColor: () => "#000",
          }}
          style={{
            borderRadius: 16,
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
