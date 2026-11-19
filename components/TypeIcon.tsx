import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";
import { typeMeta } from "../constants/requestMeta";

export const TypeIcon = ({ type, size = 40 }: { type?: string; size?: number }) => {
  const m = typeMeta(type);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: m.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialCommunityIcons name={m.icon} size={size * 0.52} color={m.fg} />
    </View>
  );
};
