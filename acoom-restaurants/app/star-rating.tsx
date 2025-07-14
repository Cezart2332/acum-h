import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

type StarRatingProps = {
  rating: number;
};

const StarRating: React.FC<StarRatingProps> = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.25 && rating % 1 < 0.75;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <View className="flex-row items-center ">
      {/* Stele pline */}
      {Array(fullStars)
        .fill(null)
        .map((_, i) => (
          <FontAwesome
            key={`full-${i}`}
            name="star"
            size={20}
            color="#facc15"
          />
        ))}

      {/* Stea pe jumătate */}
      {hasHalfStar && (
        <FontAwesome name="star-half-full" size={20} color="#facc15" />
      )}

      {/* Stele goale */}
      {Array(emptyStars)
        .fill(null)
        .map((_, i) => (
          <FontAwesome
            key={`empty-${i}`}
            name="star-o"
            size={20}
            color="#9ca3af"
          />
        ))}

      {/* Valoare numerică */}
      <Text className="ml-2 text-gray-600 text-base">
        {rating.toFixed(1)}/5
      </Text>
    </View>
  );
};

export default StarRating;
