import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const LikeButton = () => {
  const liked = useSharedValue(0);

  const outlineStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(liked.value, [0, 1], [1, 0], Extrapolate.CLAMP),
      },
    ],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: liked.value }],
    opacity: liked.value,
  }));

  return (
    <Pressable onPress={() => (liked.value = withSpring(liked.value ? 0 : 1))}>
      <View style={styles.circle}>
        {/* Ambele iconițe sunt poziționate absolut în centru */}
        <Animated.View style={[styles.iconContainer, outlineStyle]}>
          <MaterialCommunityIcons name="heart-outline" size={24} color="white" />
        </Animated.View>
        <Animated.View style={[styles.iconContainer, fillStyle]}>
          <MaterialCommunityIcons name="heart" size={24} color="white" />
        </Animated.View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  circle: {
    backgroundColor: "orange",
    borderRadius: 25,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default LikeButton;
