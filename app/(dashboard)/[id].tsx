import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RejectModal } from "../../components/RejectModal";
import { Sheet } from "../../components/Sheet";
import { StatusPill } from "../../components/StatusPill";
import { TypeIcon } from "../../components/TypeIcon";
import { fmtDateTime, STATUS_META, typeMeta } from "../../constants/requestMeta";
import { F, T } from "../../constants/theme";
import { eventBus } from "../../services/eventBus";
import { mockApi } from "../../services/mockApi";
import { Approval } from "../../types/approval";

type Notice = { kind: "success" | "error"; text: string } | null;

const errText = (e: unknown, fallback: string) =>
  typeof e === "string" ? e : e instanceof Error ? e.message : fallback;

export default function ApprovalDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [approval, setApproval] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [showTech, setShowTech] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoadError(null);
      const a = await mockApi.getApprovalById(id);
      setApproval(a);
      eventBus.emit("approvalUpdated", { id: a.id, status: a.status, reason: a.reason });
      return a;
    } catch (e) {
      setLoadError(errText(e, "Couldn't load this request."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async () => {
    if (!approval) return;
    setProcessing(true);
    try {
      await mockApi.approveRequest(approval.id);
      setConfirmOpen(false);
      await load();
      setNotice({ kind: "success", text: "Approved and applied in Zuora." });
    } catch (e) {
      setConfirmOpen(false);
      const fresh = await load();
      if (!fresh?.reason) setNotice({ kind: "error", text: errText(e, "Zuora could not apply this change.") });
    } finally {
      setProcessing(false);
    }
  };

  const reject = async (reason: string) => {
    if (!approval) return;
    setProcessing(true);
    try {
      await mockApi.rejectRequest(approval.id, reason);
      setRejectOpen(false);
      await load();
      setNotice({ kind: "success", text: "Request rejected. Nothing was changed in Zuora." });
    } catch (e) {
      setNotice({ kind: "error", text: errText(e, "Couldn't reject this request.") });
      setRejectOpen(false);
    } finally {
      setProcessing(false);
    }
  };

  const topBar = (
    <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8} accessibilityLabel="Back">
        <MaterialCommunityIcons name="arrow-left" size={22} color={T.text} />
      </Pressable>
      <Text style={styles.topTitle}>{approval ? `Request #${approval.id}` : "Request"}</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={T.surface} />
        {topBar}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.brand} />
        </View>
      </View>
    );
  }

  if (!approval) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={T.surface} />
        {topBar}
        <View style={styles.center}>
          <MaterialCommunityIcons name="cloud-alert" size={40} color={T.text3} />
          <Text style={styles.stateTitle}>Couldn't open this request</Text>
          <Text style={styles.stateText}>{loadError || "It may have been removed."}</Text>
          <Pressable
            style={styles.stateBtn}
            onPress={() => {
              setLoading(true);
              load();
            }}
          >
            <Text style={styles.stateBtnText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const meta = typeMeta(approval.category);
  const status = STATUS_META[approval.status];
  const pending = approval.status === "pending";
  const isRefund = approval.category === "Refund";
  const details: [string, string][] = [
    ["Account", approval.accountNumber || approval.username],
    [isRefund ? "Payment" : "Subscription", approval.reference || approval.subscriptionNumber || ""],
    ...Object.entries(approval.extraFields || {})
      .filter(([k]) => !["Payment #", "Subscription #"].includes(k))
      .map(([k, v]) => [k.replace(/#$/, "number").trim(), String(v)] as [string, string]),
    ["Request ID", `#${approval.id}`],
  ].filter(([, v]) => !!v && v !== "N/A") as [string, string][];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.surface} />
      {topBar}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: pending ? 120 : insets.bottom + 24 }}>
        {notice && (
          <View style={[styles.notice, notice.kind === "success" ? styles.noticeOk : styles.noticeErr]}>
            <MaterialCommunityIcons
              name={notice.kind === "success" ? "check-circle" : "alert-circle"}
              size={18}
              color={notice.kind === "success" ? T.green : T.red}
            />
            <Text style={[styles.noticeText, { color: notice.kind === "success" ? T.green : T.red }]}>{notice.text}</Text>
            <Pressable onPress={() => setNotice(null)} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={16} color={T.text3} />
            </Pressable>
          </View>
        )}

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <TypeIcon type={approval.category} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={styles.heroType}>{meta.label}</Text>
              <StatusPill status={approval.status} large />
            </View>
          </View>
          <Text style={styles.heroSummary}>{approval.summary || approval.description}</Text>
          <View style={styles.heroMeta}>
            <MaterialCommunityIcons name="domain" size={14} color={T.text2} />
            <Text style={styles.heroMetaText}>{approval.accountNumber || approval.username}</Text>
            <Text style={styles.dot}>•</Text>
            <MaterialCommunityIcons name="clock-outline" size={14} color={T.text2} />
            <Text style={styles.heroMetaText}>{fmtDateTime(approval.timestamp)}</Text>
          </View>
        </View>

        {(approval.status === "failed" || approval.status === "rejected") && !!approval.reason && (
          <View style={[styles.reasonBox, { backgroundColor: status.bg === T.greyBg ? T.redBg : status.bg }]}>
            <Text style={styles.reasonLabel}>
              {approval.status === "failed" ? "Zuora rejected this change" : "Rejection reason"}
            </Text>
            <Text style={styles.reasonText}>{approval.reason}</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Details</Text>
        <View style={styles.panel}>
          {details.map(([k, v], i) => (
            <View key={k} style={[styles.row, i === details.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.rowKey}>{k}</Text>
              <Text style={styles.rowVal} selectable>{v}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Activity</Text>
        <View style={styles.panel}>
          <View style={styles.tlItem}>
            <View style={styles.tlRail}>
              <View style={[styles.tlDot, { backgroundColor: T.blue }]} />
              <View style={styles.tlLine} />
            </View>
            <View style={styles.tlBody}>
              <Text style={styles.tlTitle}>Requested by customer</Text>
              <Text style={styles.tlSub}>{fmtDateTime(approval.timestamp)} · via KloudLenz portal</Text>
            </View>
          </View>
          <View style={styles.tlItem}>
            <View style={styles.tlRail}>
              <View style={[styles.tlDot, { backgroundColor: pending ? T.orange : status.fg }]} />
            </View>
            <View style={styles.tlBody}>
              <Text style={styles.tlTitle}>
                {pending
                  ? "Awaiting your decision"
                  : approval.status === "approved"
                    ? "Approved and applied in Zuora"
                    : approval.status === "rejected"
                      ? "Rejected"
                      : "Approved, but Zuora refused the change"}
              </Text>
              {!pending && !!approval.decidedOn && <Text style={styles.tlSub}>{fmtDateTime(approval.decidedOn)}</Text>}
            </View>
          </View>
        </View>

        {!!approval.rawJson && (
          <View style={[styles.panel, { marginTop: 14 }]}>
            <Pressable style={styles.techHead} onPress={() => setShowTech((s) => !s)}>
              <MaterialCommunityIcons name="code-braces" size={16} color={T.text2} />
              <Text style={styles.techTitle}>Technical details</Text>
              <MaterialCommunityIcons name={showTech ? "chevron-up" : "chevron-down"} size={20} color={T.text3} />
            </Pressable>
            {showTech && (
              <Text style={styles.techBody} selectable>
                {approval.rawJson}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {pending && (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
          <Pressable
            style={({ pressed }) => [styles.btn, styles.btnReject, pressed && { backgroundColor: T.brandTint }]}
            onPress={() => setRejectOpen(true)}
            disabled={processing}
          >
            <MaterialCommunityIcons name="close" size={18} color={T.brand} />
            <Text style={styles.btnRejectText}>Reject</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btn, styles.btnApprove, pressed && { backgroundColor: T.brandHover }]}
            onPress={() => setConfirmOpen(true)}
            disabled={processing}
          >
            <MaterialCommunityIcons name="check" size={18} color={T.white} />
            <Text style={styles.btnApproveText}>Approve</Text>
          </Pressable>
        </View>
      )}

      <Sheet visible={confirmOpen} onClose={() => setConfirmOpen(false)} dismissable={!processing}>
        <View style={styles.confirmIcon}>
          <TypeIcon type={approval.category} size={52} />
        </View>
        <Text style={styles.confirmTitle}>Approve this request?</Text>
        <Text style={styles.confirmSummary}>{approval.summary}</Text>
        <View style={styles.confirmNote}>
          <MaterialCommunityIcons name="lightning-bolt-outline" size={16} color={T.amber} />
          <Text style={styles.confirmNoteText}>
            The change is applied in Zuora for {approval.accountNumber || "this account"} immediately and can't be undone from the app.
          </Text>
        </View>
        <View style={styles.confirmActions}>
          <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setConfirmOpen(false)} disabled={processing}>
            <Text style={styles.btnGhostText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnApprove, processing && { opacity: 0.8 }]} onPress={approve} disabled={processing}>
            {processing ? (
              <>
                <ActivityIndicator color={T.white} size="small" />
                <Text style={styles.btnApproveText}>Applying…</Text>
              </>
            ) : (
              <Text style={styles.btnApproveText}>Approve</Text>
            )}
          </Pressable>
        </View>
      </Sheet>

      <RejectModal
        visible={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onSubmit={reject}
        isLoading={processing}
        summary={approval.summary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.pageBg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.borderSubtle,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.greyBg,
  },
  topTitle: { fontFamily: F.semibold, fontSize: 16, color: T.text },
  stateTitle: { fontFamily: F.bold, fontSize: 16, color: T.text, marginTop: 12 },
  stateText: { fontFamily: F.regular, fontSize: 13, color: T.text2, textAlign: "center", marginTop: 6 },
  stateBtn: { marginTop: 16, backgroundColor: T.brand, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  stateBtnText: { fontFamily: F.semibold, fontSize: 14, color: T.white },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  noticeOk: { backgroundColor: T.greenBg },
  noticeErr: { backgroundColor: T.redBg },
  noticeText: { flex: 1, fontFamily: F.semibold, fontSize: 13 },
  hero: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.cardBorder,
    padding: 18,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroType: {
    fontFamily: F.semibold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: T.text3,
    marginBottom: 6,
  },
  heroSummary: { fontFamily: F.bold, fontSize: 21, lineHeight: 28, color: T.text, marginTop: 16 },
  heroMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, marginTop: 12 },
  heroMetaText: { fontFamily: F.medium, fontSize: 12.5, color: T.text2 },
  dot: { color: T.text3, marginHorizontal: 3 },
  reasonBox: { borderRadius: 12, padding: 14, marginTop: 12 },
  reasonLabel: {
    fontFamily: F.semibold,
    fontSize: 10.5,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: T.red,
  },
  reasonText: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: T.text, marginTop: 4 },
  sectionLabel: {
    fontFamily: F.semibold,
    fontSize: 10.5,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: T.text3,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  panel: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.cardBorder,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: T.borderSubtle,
  },
  rowKey: { fontFamily: F.regular, fontSize: 13.5, color: T.text2 },
  rowVal: { flexShrink: 1, fontFamily: F.semibold, fontSize: 13.5, color: T.text, textAlign: "right" },
  tlItem: { flexDirection: "row", paddingHorizontal: 16 },
  tlRail: { width: 18, alignItems: "center", paddingTop: 18 },
  tlDot: { width: 10, height: 10, borderRadius: 5 },
  tlLine: { flex: 1, width: 2, backgroundColor: T.border, marginTop: 4 },
  tlBody: { flex: 1, paddingVertical: 13, paddingLeft: 8 },
  tlTitle: { fontFamily: F.semibold, fontSize: 13.5, color: T.text },
  tlSub: { fontFamily: F.regular, fontSize: 12, color: T.text2, marginTop: 2 },
  techHead: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  techTitle: { flex: 1, fontFamily: F.semibold, fontSize: 13.5, color: T.text2 },
  techBody: {
    fontFamily: "monospace",
    fontSize: 11,
    lineHeight: 16,
    color: T.text2,
    backgroundColor: "#f7f8fa",
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: T.borderSubtle,
  },
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.borderSubtle,
    shadowColor: "#101828",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnReject: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.brandBorder },
  btnRejectText: { fontFamily: F.semibold, fontSize: 15, color: T.brand },
  btnApprove: { backgroundColor: T.brand },
  btnApproveText: { fontFamily: F.semibold, fontSize: 15, color: T.white },
  btnGhost: { backgroundColor: T.greyBg },
  btnGhostText: { fontFamily: F.semibold, fontSize: 15, color: T.text2 },
  confirmIcon: { alignItems: "center", marginTop: 4 },
  confirmTitle: { fontFamily: F.bold, fontSize: 19, color: T.text, textAlign: "center", marginTop: 12 },
  confirmSummary: { fontFamily: F.medium, fontSize: 14.5, color: T.text2, textAlign: "center", marginTop: 6 },
  confirmNote: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: T.amberBg,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  confirmNoteText: { flex: 1, fontFamily: F.regular, fontSize: 12.5, lineHeight: 18, color: T.amber },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 18 },
});
