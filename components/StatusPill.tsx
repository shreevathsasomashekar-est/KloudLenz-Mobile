import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { STATUS_META } from "../constants/requestMeta";
import { F, T } from "../constants/theme";
import { ApprovalStatus } from "../types/approval";

export const StatusPill = ({ status, large }: { status: ApprovalStatus; large?: boolean }) => {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <View style={[styles.pill, { backgroundColor: m.bg }, large && styles.large]}>
      <MaterialCommunityIcons name={m.icon} size={large ? 14 : 12} color={m.fg} />
      <Text style={[styles.text, { color: m.fg }, large && styles.largeText]}>{m.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: T.pillRadius,
    alignSelf: "flex-start",
  },
  large: { paddingHorizontal: 10, paddingVertical: 5 },
  text: { fontFamily: F.semibold, fontSize: 11 },
  largeText: { fontSize: 12 },
});
