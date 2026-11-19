import { Approval, ApprovalStatus } from "../types/approval";
import { User } from "../types/user";
import { API_CONFIG, apiClient } from "./apiConfig";
import { getDeviceType } from "./fcmTokenManager";

/**
 * Backend API Service
 * All API calls to the backend server using axios
 *
 * API Endpoints:
 * - POST /admin/login - User authentication
 * - GET /approval/allDetails - Get all approvals
 * - GET /approval/getDetails/:id - Get approval by ID
 * - POST /approval/modifyStatus - Approve / reject a request
 */

const mapStatus = (s: any): ApprovalStatus => {
  const v = String(s || "").toLowerCase();
  if (v === "approved" || v === "success") return "approved";
  if (v === "rejected") return "rejected";
  if (v === "failed") return "failed";
  return "pending";
};

// modifyStatus answers HTTP 200 even when Zuora refuses the change; the outcome is in the body.
const assertDecision = (body: any, fallback: string) => {
  if (body?.success === false || body?.data?.success === false) {
    throw body?.data?.reasons?.[0]?.message || body?.message || fallback;
  }
  return body;
};

const parseRaw = (raw: any): any => {
  if (raw && typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw || {};
};

// Backend dates carry microseconds ("2026-11-17T23:22:25.543202"); trim to ms so Hermes parses them
export const normDate = (s: any): string =>
  typeof s === "string" ? s.replace(/(\.\d{3})\d+/, "$1") : "";

const buildSummary = (type: string, raw: any, item: any): string => {
  const sub = raw.subscriptions?.[0]?.referenceNumber || item.referenceNumber || "";
  const actions: any[] = raw.subscriptions?.[0]?.orderActions || [];
  const act = (t: string) => actions.find((a) => a?.type === t);
  switch (type) {
    case "Refund": {
      const amt = parseFloat(raw.totalAmount);
      const pay = raw.paymentKey || item.referenceNumber || "";
      return `Refund${isNaN(amt) ? "" : ` $${amt.toFixed(2)}`}${pay ? ` on payment ${pay}` : ""}`;
    }
    case "ChangeProduct":
      return `Change plan: ${raw.productNames?.old || "?"} → ${raw.productNames?.new || "?"}`;
    case "AddProduct":
      return `Add product${raw.productNames?.new ? ` ${raw.productNames.new}` : ""}${sub ? ` to ${sub}` : ""}`;
    case "Suspend": {
      const s = act("Suspend")?.suspend;
      const when = s?.suspendSpecificDate || s?.suspendPolicy;
      return `Suspend ${sub}${when ? ` from ${when}` : ""}`;
    }
    case "CancelSubscription": {
      const c = act("CancelSubscription")?.cancelSubscription;
      const when = c?.cancellationEffectiveDate || c?.cancellationPolicy;
      return `Cancel ${sub}${when ? ` effective ${when}` : ""}`;
    }
    case "TermsAndConditions": {
      const tc = act("TermsAndConditions")?.termsAndConditions;
      const term = tc?.lastTerm ? `${tc.lastTerm.period} ${tc.lastTerm.periodType}` : "";
      const auto = tc ? `auto-renew ${tc.autoRenew ? "on" : "off"}` : "";
      const tail = [term, auto].filter(Boolean).join(", ");
      return `Update terms on ${sub}${tail ? `: ${tail}` : ""}`;
    }
    default:
      return `${type || "Request"}${sub ? ` on ${sub}` : ""}`;
  }
};

export const backendApi = {
  /**
   * Login user
   * @param username - User's username/email
   * @param password - User's password
   * @returns User object with auth token
   *
   * API: POST /admin/login (full: BASE_URL + /admin/login)
   * Request: { username: string, password: string }
   * Response: { message: string, statusCode: 200, data: { email, firstName, id, lastName }, timestamp }
   */
  login: async (username: string, password: string): Promise<User> => {
    const requestBody = {
      email: username, // Backend expects 'email', not 'username'
      password,
    };

    console.log("📤 Login Request:");
    console.log("   URL:", `${API_CONFIG.BASE_URL}/admin/login`);
    console.log("   Body:", JSON.stringify(requestBody, null, 2));

    const response = await apiClient.post("/admin/login", requestBody);

    // Backend response structure: response.data.data contains user info
    const userData = response.data.data;

    // Transform backend response to User type
    const email = userData.email ?? userData.userEmail ?? username;
    const user: User = {
      id: String(userData.id ?? userData.userId), // Convert number to string
      username: email.split("@")[0], // Extract username from email
      email,
      name: `${userData.firstName} ${userData.lastName}`,
      role: "approver", // Default role
    };

    // Store token if needed
    // await SecureStore.setItemAsync('authToken', response.data.token);

    return user;
  },

  /**
   * Get all approvals
   * @returns Array of approval objects
   *
   * API: GET /approval/allDetails
   * Query params: ?status=pending (optional)
   * Response: { message, statusCode, data: [...], timestamp }
   */
  getApprovals: async (): Promise<Approval[]> => {
    const response = await apiClient.get("/approval/allDetails");

    console.log("📥 Get Approvals Response:");
    console.log("   Status:", response.status);
    console.log("   Data:", JSON.stringify(response.data, null, 2));

    // Backend returns data in response.data.data array
    const approvalsData = response.data.data || [];

    // Transform backend response to Approval type
    return approvalsData.map((item: any) => {
      const raw = parseRaw(item.rawJson);
      const subNo = item.subscriptionNumber || raw.subscriptions?.[0]?.subscriptionNumber || item.referenceNumber || raw.paymentKey || "";
      return {
        id: String(item.id),
        userId: String(item.id), // Using id as userId for now
        username: raw.existingAccountNumber || raw.accountNumber || raw.accountId || item.subscriptionNumber || item.referenceNumber || "N/A",
        description: item.reason || buildSummary(item.type, raw, item),
        category: item.type || "general",
        suspensionPolicy: item.type || "none",
        executionDate: raw.orderDate || raw.refundDate || normDate(item.createdOn) || new Date().toISOString(),
        status: mapStatus(item.status),
        timestamp: normDate(item.createdOn) || new Date().toISOString(),
        rejectionReason: item.reason || undefined,
        subscriptionNumber: subNo,
        summary: buildSummary(item.type, raw, item),
        accountNumber: raw.existingAccountNumber || raw.accountNumber || "",
        reference: item.referenceNumber || subNo,
        reason: item.reason || undefined,
        decidedOn: normDate(item.approvedOn) || undefined,
        extraFields: {
          subscriptionNumber: subNo,
        },
      };
    });
  },

  /**
  * Get approval by ID
  * @param id - Approval ID
  * @returns Single approval object
  *
  * API: GET /approval/getDetails/:id
  * Response: { approval: Approval }
  */
  getApprovalById: async (id: string): Promise<Approval> => {
    const response = await apiClient.get(`/approval/getDetails/${id}`);

    console.log(`📥 Get Approval ${id} Response:`);
    console.log("   Data:", JSON.stringify(response.data, null, 2));

    const item = response.data.data || response.data;
    const rawJson = parseRaw(item.rawJson);

    // Extract deep fields for display
    let displayFields: any = {};
    const lowerCategory = item.type?.toLowerCase();

    if (lowerCategory === "refund") {
      displayFields["Payment #"] = item.referenceNumber || rawJson.paymentKey || "";
      if (rawJson.totalAmount) {
        displayFields["Refund Amount"] = `$${parseFloat(rawJson.totalAmount).toFixed(2)}`;
      }
      displayFields["Refund Type"] = rawJson.type || "Electronic";
    } else {
      displayFields["Subscription #"] = item.subscriptionNumber || (rawJson.subscriptions?.[0]?.subscriptionNumber) || item.referenceNumber || (rawJson.subscriptions?.[0]?.referenceNumber) || "";
      // Account# moved to the 'username' (header) position as per user request
    }

    // Handle Category specific fields
    if (lowerCategory === "suspend") {
      const suspendAction = rawJson.subscriptions?.[0]?.orderActions?.find((a: any) => a.type === "Suspend");
      displayFields["Suspension policy"] = suspendAction?.suspend?.suspendPolicy || item.type || "N/A";
    }

    // Extra Product Names (if available)
    if (rawJson.productNames) {
      if (rawJson.productNames.old) {
        displayFields["Existing Product"] = rawJson.productNames.old;
      }
      if (rawJson.productNames.new) {
        displayFields["New Product"] = rawJson.productNames.new;
      }
    }

    if (rawJson.subscriptions && rawJson.subscriptions.length > 0) {
      const sub = rawJson.subscriptions[0];
      if (sub.orderActions && sub.orderActions.length > 0) {

        // Handle Terms Update
        const termsAction = sub.orderActions.find((a: any) => a.termsAndConditions);
        if (termsAction) {
          const terms = termsAction.termsAndConditions;
          if (terms.lastTerm) {
            displayFields["Contract Start Date"] = terms.lastTerm.startDate;
            displayFields["Initial Term"] = `${terms.lastTerm.period} ${terms.lastTerm.periodType}`;
          }
          if (terms.renewalTerms && terms.renewalTerms.length > 0) {
            displayFields["Renewal Term"] = `${terms.renewalTerms[0].period} ${terms.renewalTerms[0].periodType}`;
          }
          displayFields["Auto Renew"] = terms.autoRenew ? "Yes" : "No";
        }


        // Handle Change Product
        // Handle Change Product
        // IDs removed as per user request (using Product Names instead)

        // Handle Suspend
        if (lowerCategory === "suspend") {
          const suspendAction = sub.orderActions.find((a: any) => a.type === "Suspend");
          if (suspendAction && suspendAction.suspend) {
            displayFields["Suspension policy"] = suspendAction.suspend.suspendPolicy;
            displayFields["Specific Date"] = suspendAction.suspend.suspendSpecificDate || "N/A";
          }
        }

        // Handle Cancel
        const cancelAction = sub.orderActions.find((a: any) => a.type === "CancelSubscription");
        if (cancelAction && cancelAction.cancelSubscription) {
          displayFields["Cancel Policy"] = cancelAction.cancelSubscription.cancellationPolicy;
          displayFields["Effective Date"] = cancelAction.cancelSubscription.cancellationEffectiveDate || "N/A";
        }
      }
    }

    // Normalized Categories mapping
    const categoryMap: Record<string, string> = {
      "Suspend": "Suspend",
      "CancelSubscription": "CancelSubscription",
      "TermsAndConditions": "TermsAndConditions",
      "ChangeProduct": "ChangeProduct",
      "Refund": "Refund"
    };
    const category = categoryMap[item.type] || item.type || "General";

    // Determine readable description
    let desc = item.reason || "No description";
    if (!item.reason) {
      if (item.type === "ChangeProduct") desc = "Request to Change Product";
      else if (item.type === "TermsAndConditions") desc = "Request to Update Terms";
      else if (item.type === "SuspendSubscription" || item.type === "Suspend") desc = "Request to Suspend Subscription";
      else if (item.type === "CancelSubscription") desc = "Request to Cancel Subscription";
      else if (item.type === "Refund") desc = "Request for Payment Refund";
      else desc = `Request type: ${item.type || 'General'}`;
    }

    // Transform to Approval type
    return {
      id: String(item.id),
      userId: String(item.id), // Using id as userId for now
      username: rawJson.existingAccountNumber || rawJson.accountNumber || rawJson.accountId || "N/A",
      description: desc,
      category: category,
      suspensionPolicy: displayFields["Suspension policy"] || "N/A",
      executionDate: rawJson.orderDate || rawJson.refundDate || normDate(item.createdOn) || new Date().toISOString(),
      status: mapStatus(item.status),
      timestamp: normDate(item.createdOn),
      rejectionReason: item.reason || undefined,
      subscriptionNumber: item.subscriptionNumber || rawJson.subscriptionNumber || item.referenceNumber || (rawJson.subscriptions?.[0]?.referenceNumber) || "",
      extraFields: displayFields,
      summary: buildSummary(item.type, rawJson, item),
      accountNumber: rawJson.existingAccountNumber || rawJson.accountNumber || "",
      reference: item.referenceNumber || "",
      reason: item.reason || undefined,
      decidedOn: normDate(item.approvedOn) || undefined,
      requestedBy: rawJson.existingAccountNumber ? `Account ${rawJson.existingAccountNumber}` : "",
      rawJson:
        typeof item.rawJson === "string"
          ? (() => {
            try { return JSON.stringify(JSON.parse(item.rawJson), null, 2); } catch { return item.rawJson; }
          })()
          : item.rawJson ? JSON.stringify(item.rawJson, null, 2) : "",
    };
  },

  /**
   * Approve a request
   * @param id - Approval ID
   * @param reason - Optional reason
   * @returns Updated approval object
   *
   * API: POST /approval/modifyStatus
   * Request: { id: number, status: "APPROVED", reason: string }
   */
  approveRequest: async (id: string, reason?: string): Promise<Approval> => {
    const payload = {
      id: Number(id),
      status: "APPROVED",
      reason: reason || "Approved via Mobile App"
    };
    console.log("📤 Approving Request:", JSON.stringify(payload));
    const response = await apiClient.post("/approval/modifyStatus", payload);
    return assertDecision(response.data, "Zuora could not apply this change");
  },

  /**
   * Reject a request
   * @param id - Approval ID
   * @param reason - Rejection reason (Mandatory)
   * @returns Updated approval object
   *
   * API: POST /approval/modifyStatus
   * Request: { id: number, status: "REJECTED", reason: string }
   */
  rejectRequest: async (id: string, reason: string): Promise<Approval> => {
    const payload = {
      id: Number(id),
      status: "REJECTED",
      reason: reason
    };
    console.log("📤 Rejecting Request:", JSON.stringify(payload));
    const response = await apiClient.post("/approval/modifyStatus", payload);
    return assertDecision(response.data, "Could not reject this request");
  },

  /**
   * Register FCM device token for push notifications
   * @param userId - User ID
   * @param token - FCM device token
   * @returns Success response
   *
   * API: POST /user/device-token (full: BASE_URL + /user/device-token)
   * Request: { userId: string, token: string, deviceType: "ANDROID" | "IOS" }
   * Response: { message: string, success: boolean }
   */
  registerDeviceToken: async (userId: string, token: string): Promise<void> => {
    const deviceType = getDeviceType();
    const response = await apiClient.post("/user/device-token", {
      userId,
      token,
      deviceType,
    });
    console.log(
      "📤 FCM Device Token registered:",
      response.data.message || "Success",
    );
    console.log("   Device Type:", deviceType);
  },
};
