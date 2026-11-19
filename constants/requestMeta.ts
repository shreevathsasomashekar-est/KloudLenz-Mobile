import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ApprovalStatus } from "../types/approval";
import { T } from "./theme";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export interface TypeMeta {
  label: string;
  icon: IconName;
  fg: string;
  bg: string;
}

const TYPES: Record<string, TypeMeta> = {
  Refund: { label: "Refund", icon: "cash-refund", fg: T.green, bg: T.greenBg },
  Suspend: { label: "Suspend subscription", icon: "pause-circle-outline", fg: T.orange, bg: T.orangeBg },
  CancelSubscription: { label: "Cancel subscription", icon: "close-circle-outline", fg: T.brand, bg: T.brandTint },
  ChangeProduct: { label: "Change plan", icon: "swap-horizontal", fg: T.blue, bg: T.blueBg },
  AddProduct: { label: "Add product", icon: "plus-box-outline", fg: T.blue, bg: T.blueBg },
  TermsAndConditions: { label: "Update terms", icon: "file-document-edit-outline", fg: T.purple, bg: T.purpleBg },
};

export const typeMeta = (type?: string): TypeMeta =>
  TYPES[type || ""] || { label: type || "Request", icon: "clipboard-text-outline", fg: T.text2, bg: T.greyBg };

export const STATUS_META: Record<ApprovalStatus, { label: string; fg: string; bg: string; icon: IconName }> = {
  pending: { label: "Pending", fg: T.amber, bg: T.amberBg, icon: "clock-outline" },
  approved: { label: "Approved", fg: T.green, bg: T.greenBg, icon: "check-circle-outline" },
  rejected: { label: "Rejected", fg: T.red, bg: T.redBg, icon: "close-circle-outline" },
  failed: { label: "Failed", fg: T.grey, bg: T.greyBg, icon: "alert-circle-outline" },
};

export const timeAgo = (iso?: string): string => {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return "";
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

export const fmtDateTime = (iso?: string): string => {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
};
