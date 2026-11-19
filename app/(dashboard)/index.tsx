import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApprovalCard } from "../../components/ApprovalCard";
import { STATUS_META } from "../../constants/requestMeta";
import { F, T } from "../../constants/theme";
import { eventBus } from "../../services/eventBus";
import { mockApi } from "../../services/mockApi";
import { getCurrentUser, signOut } from "../../services/session";
import { Approval, ApprovalStatus } from "../../types/approval";

type Filter = "all" | ApprovalStatus;
const TILES: ApprovalStatus[] = ["pending", "approved", "rejected", "failed"];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default function ApprovalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = getCurrentUser();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      setError(null);
      setApprovals(await mockApi.getApprovals());
    } catch (e) {
      setError(typeof e === "string" ? e : "Couldn't load approvals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const handler = (p: Partial<Approval> & { id: string }) =>
      setApprovals((prev) => prev.map((a) => (a.id === p.id ? { ...a, ...p } : a)));
    eventBus.on("approvalUpdated", handler);
    return () => eventBus.off("approvalUpdated", handler);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<ApprovalStatus, number> = { pending: 0, approved: 0, rejected: 0, failed: 0 };
    approvals.forEach((a) => (c[a.status] = (c[a.status] || 0) + 1));
    return c;
  }, [approvals]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return approvals
      .filter((a) => filter === "all" || a.status === filter)
      .filter((a) =>
        !q
          ? true
          : [a.summary, a.accountNumber, a.reference, a.category, a.id]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q)),
      )
      .sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (b.status === "pending" && a.status !== "pending") return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [approvals, filter, query]);

  const confirmSignOut = () =>
    Alert.alert("Sign out", "You'll stop receiving approval notifications on this device until you sign in again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);

  const initials = (user?.name || user?.email || "?")
    .split(/[\s@.]+/)
    .filter((s) => s && s !== "undefined")
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  const firstName = user?.name?.split(" ")[0];

  const header = (
    <View>
      <View style={[styles.hero, { paddingTop: insets.top + 14 }]}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>{greeting()}{firstName && firstName !== "undefined" ? `, ${firstName}` : ""}</Text>
            <Text style={styles.heroTitle}>Approvals</Text>
          </View>
          <Pressable onPress={confirmSignOut} style={styles.avatar} accessibilityLabel="Account and sign out">
            <Text style={styles.avatarText}>{initials || "KL"}</Text>
          </Pressable>
        </View>
        <Text style={styles.heroSub}>
          {counts.pending > 0
            ? `${counts.pending} request${counts.pending === 1 ? "" : "s"} waiting for your decision`
            : "You're all caught up"}
        </Text>
      </View>

      <View style={styles.tiles}>
        {TILES.map((s) => {
          const m = STATUS_META[s];
          const active = filter === s;
          return (
            <Pressable
              key={s}
              onPress={() => setFilter(active ? "all" : s)}
              style={[styles.tile, active && styles.tileActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <View style={[styles.tileIcon, { backgroundColor: m.bg }]}>
                <MaterialCommunityIcons name={m.icon} size={15} color={m.fg} />
              </View>
              <Text style={styles.tileCount}>{counts[s]}</Text>
              <Text style={[styles.tileLabel, active && { color: T.brand }]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.search}>
        <MaterialCommunityIcons name="magnify" size={19} color={T.text3} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search account or reference"
          numberOfLines={1}
          placeholderTextColor={T.text3}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
        />
        {!!query && (
          <Pressable onPress={() => setQuery("")} hitSlop={10}>
            <MaterialCommunityIcons name="close-circle" size={17} color={T.text3} />
          </Pressable>
        )}
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>
          {filter === "all" ? "All requests" : `${STATUS_META[filter].label} requests`}
          <Text style={styles.sectionCount}>  {visible.length}</Text>
        </Text>
        {filter !== "all" && (
          <Pressable onPress={() => setFilter("all")} hitSlop={8}>
            <Text style={styles.link}>Show all</Text>
          </Pressable>
        )}
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="wifi-alert" size={18} color={T.red} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={load} style={styles.retry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={T.brand} />
        <ActivityIndicator size="large" color={T.brand} />
        <Text style={styles.loadingText}>Loading approvals…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={T.brand} />
      <FlatList
        data={visible}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <ApprovalCard
            approval={item}
            onPress={() => router.push({ pathname: "/(dashboard)/[id]", params: { id: item.id } })}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          error ? null : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons
                  name={filter === "pending" && !query ? "check-all" : "text-search"}
                  size={30}
                  color={T.green}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {query ? "No matches" : filter === "pending" ? "Nothing to review" : "No requests here"}
              </Text>
              <Text style={styles.emptyText}>
                {query
                  ? "Try another account, payment or subscription number."
                  : filter === "pending"
                    ? "New requests from customers will appear here and on your notifications."
                    : "Pull down to refresh."}
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.brand]} tintColor={T.white} progressViewOffset={insets.top} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.pageBg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: T.pageBg },
  loadingText: { fontFamily: F.medium, fontSize: 13, color: T.text2, marginTop: 12 },
  hero: {
    backgroundColor: T.brand,
    paddingHorizontal: 20,
    paddingBottom: 56,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  heroTop: { flexDirection: "row", alignItems: "center" },
  hello: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.8)" },
  heroTitle: { fontFamily: F.bold, fontSize: 26, color: T.white, marginTop: 2 },
  heroSub: { fontFamily: F.regular, fontSize: 13.5, color: "rgba(255,255,255,0.88)", marginTop: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: F.bold, fontSize: 14, color: T.white },
  tiles: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: -38 },
  tile: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: T.cardBorder,
    paddingVertical: 11,
    paddingHorizontal: 9,
    shadowColor: "#101828",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  tileActive: { borderColor: T.brand, backgroundColor: T.brandTint },
  tileIcon: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  tileCount: { fontFamily: F.bold, fontSize: 20, color: T.text, marginTop: 8 },
  tileLabel: { fontFamily: F.medium, fontSize: 11, color: T.text2, marginTop: 1 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 46,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.cardBorder,
  },
  searchInput: { flex: 1, height: "100%", fontFamily: F.regular, fontSize: 14, color: T.text },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: { fontFamily: F.bold, fontSize: 15, color: T.text },
  sectionCount: { fontFamily: F.semibold, fontSize: 13, color: T.text3 },
  link: { fontFamily: F.semibold, fontSize: 13, color: T.brand },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: T.redBg,
  },
  errorText: { flex: 1, fontFamily: F.medium, fontSize: 13, color: T.red },
  retry: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: T.surface },
  retryText: { fontFamily: F.semibold, fontSize: 12.5, color: T.brand },
  empty: { alignItems: "center", paddingHorizontal: 40, paddingTop: 40 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: T.greenBg,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontFamily: F.bold, fontSize: 16, color: T.text, marginTop: 14 },
  emptyText: { fontFamily: F.regular, fontSize: 13, lineHeight: 19, color: T.text2, textAlign: "center", marginTop: 6 },
});
