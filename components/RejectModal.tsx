import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { F, T } from "../constants/theme";
import { Sheet } from "./Sheet";

interface RejectModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
  isLoading?: boolean;
  summary?: string;
}

const PRESETS = [
  "Needs manager sign-off",
  "Incorrect amount",
  "Duplicate request",
  "Customer to contact sales",
];

export const RejectModal: React.FC<RejectModalProps> = ({ visible, onCancel, onSubmit, isLoading = false, summary }) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!visible) setReason("");
  }, [visible]);

  const canSubmit = reason.trim().length > 0 && !isLoading;

  return (
    <Sheet visible={visible} onClose={onCancel} dismissable={!isLoading}>
      <Text style={styles.title}>Reject request</Text>
      {!!summary && <Text style={styles.subtitle}>{summary}</Text>}

      <Text style={styles.label}>Quick reasons</Text>
      <View style={styles.presets}>
        {PRESETS.map((p) => {
          const active = reason === p;
          return (
            <Pressable
              key={p}
              onPress={() => setReason(p)}
              disabled={isLoading}
              style={[styles.preset, active && styles.presetActive]}
            >
              <Text style={[styles.presetText, active && styles.presetTextActive]}>{p}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Reason shared with the requester</Text>
      <TextInput
        style={styles.input}
        placeholder="Explain why this request is being rejected"
        placeholderTextColor={T.text3}
        multiline
        value={reason}
        onChangeText={setReason}
        editable={!isLoading}
        maxLength={500}
      />

      <View style={styles.actions}>
        <Pressable style={[styles.btn, styles.btnGhost]} onPress={onCancel} disabled={isLoading}>
          <Text style={styles.btnGhostText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.btnDanger, !canSubmit && styles.btnDisabled]}
          onPress={() => canSubmit && onSubmit(reason.trim())}
          disabled={!canSubmit}
        >
          {isLoading ? <ActivityIndicator color={T.white} /> : <Text style={styles.btnDangerText}>Reject request</Text>}
        </Pressable>
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  title: { fontFamily: F.bold, fontSize: 18, color: T.text },
  subtitle: { fontFamily: F.regular, fontSize: 13, color: T.text2, marginTop: 4 },
  label: {
    fontFamily: F.semibold,
    fontSize: 10.5,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: T.text3,
    marginTop: 18,
    marginBottom: 8,
  },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  preset: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: T.pillRadius,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  presetActive: { borderColor: T.brand, backgroundColor: T.brandTint },
  presetText: { fontFamily: F.medium, fontSize: 12.5, color: T.text2 },
  presetTextActive: { color: T.brand },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radius,
    padding: 12,
    fontFamily: F.regular,
    fontSize: 14,
    color: T.text,
    textAlignVertical: "top",
    backgroundColor: T.surface,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  btn: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnGhost: { backgroundColor: T.greyBg },
  btnGhostText: { fontFamily: F.semibold, fontSize: 15, color: T.text2 },
  btnDanger: { backgroundColor: T.brand },
  btnDangerText: { fontFamily: F.semibold, fontSize: 15, color: T.white },
  btnDisabled: { opacity: 0.45 },
});
