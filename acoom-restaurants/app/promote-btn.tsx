import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import React, { useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

const PromoteModal = () => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      {/* Promote Button */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="flex-row items-center bg-violet-600 px-5 py-3 rounded-full active:bg-violet-700"
      >
        <FontAwesome5 name="rocket" size={18} color="white" />
        <Text className="ml-2 text-white font-semibold">Promovează</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/70 backdrop-blur-sm">
          <View className="bg-zinc-900 p-6 rounded-3xl w-4/5 border border-zinc-800/50">
            {/* Header */}
            <View className="items-center mb-6">
              <FontAwesome5
                name="fire"
                size={32}
                color="#A78BFA"
                className="mb-3"
              />
              <Text className="text-2xl font-bold text-violet-300">
                Opțiuni Promovare
              </Text>
              <Text className="text-zinc-400 text-center mt-1">
                Alege tipul de promovare
              </Text>
            </View>

            {/* Business Promotion */}
            <Link href="/PromoteBsn" asChild>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="bg-zinc-800/50 p-4 rounded-xl mb-4 active:bg-zinc-800/70"
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="business"
                    size={24}
                    color="#C4B5FD"
                    className="mr-3"
                  />
                  <View>
                    <Text className="text-lg font-semibold text-violet-200">
                      Promovează Business
                    </Text>
                    <Text className="text-zinc-400 text-sm">
                      Crește vizibilitatea companiei
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Link>

            {/* Event Promotion */}
            <Link href="/PromoteEvent" asChild>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="bg-zinc-800/50 p-4 rounded-xl active:bg-zinc-800/70"
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="calendar"
                    size={24}
                    color="#C4B5FD"
                    className="mr-3"
                  />
                  <View>
                    <Text className="text-lg font-semibold text-violet-200">
                      Promovează Eveniment
                    </Text>
                    <Text className="text-zinc-400 text-sm">
                      Atrage mai mulți participanți
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Link>

            {/* Close Button */}
            <Pressable onPress={() => setModalVisible(false)} className="mt-6">
              <Text className="text-zinc-400 text-center font-medium">
                Închide
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default PromoteModal;
