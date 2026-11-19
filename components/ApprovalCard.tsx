import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { timeAgo, typeMeta } from "../constants/requestMeta";
import { F, T } from "../constants/theme";
import { Approval } from "../types/approval";
import { StatusPill } from "./StatusPill";
import { TypeIcon } from "./TypeIcon";

interface ApprovalCardProps {
  approval: Approval;
  onPress: () => void;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({ approval, onPress }) => {
  const meta = typeMeta(approval.category);
  const pending = approval.status === "pending";
  const showReason = (approval.status === "failed" || approval.status === "rejected") && !!approval.reason;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pending && styles.cardPending, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}, ${approval.summary || approval.description}, ${approval.status}`}
    >
      <TypeIcon type={approval.category} size={42} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.type} numberOfLines={1}>{meta.label}</Text>
          <Text style={styles.time}>{timeAgo(approval.timestamp)}</Text>
        </View>
        <Text style={styles.summary} numberOfLines={2}>
          {approval.summary || approval.description}
        </Text>
        <View style={styles.metaRow}>
          {!!approval.accountNumber && (
            <View style={styles.chip}>
              <MaterialCommunityIcons name="domain" size={11} color={T.text2} />
              <Text style={styles.chipText}>{approval.accountNumber}</Text>
            </View>
          )}
          <StatusPill status={approval.status} />
        </View>
        {showReason && (
          <Text style={styles.reason} numberOfLines={2}>
            {approval.reason}
          </Text>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={T.text3} style={styles.chevron} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.cardBorder,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  cardPending: { borderLeftWidth: 3, borderLeftColor: T.orange },
  pressed: { opacity: 0.85, transform: [{ scale: 0.995 }] },
  body: { flex: 1, gap: 4 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  type: {
    flex: 1,
    fontFamily: F.semibold,
    fontSize: 10.5,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: T.text3,
  },
  time: { fontFamily: F.medium, fontSize: 11, color: T.text3 },
  summary: { fontFamily: F.semibold, fontSize: 14.5, lineHeight: 20, color: T.text },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.greyBg,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  chipText: { fontFamily: F.medium, fontSize: 11, color: T.text2 },
  reason: { fontFamily: F.regular, fontSize: 12, lineHeight: 17, color: T.red, marginTop: 4 },
  chevron: { alignSelf: "center" },
});
