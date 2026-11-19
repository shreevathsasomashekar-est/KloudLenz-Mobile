export type ApprovalStatus = "pending" | "approved" | "rejected" | "failed";

export interface Approval {
  id: string; // Request ID
  userId: string;
  username: string;
  description: string;
  category?: string;
  suspensionPolicy: string;
  executionDate: string;
  status: ApprovalStatus;
  timestamp: string;
  rejectionReason?: string;
  subscriptionNumber?: string;
  summary?: string;
  requestedBy?: string;
  rawJson?: string;
  accountNumber?: string;
  reference?: string;
  reason?: string;
  decidedOn?: string;
  // Additional, request-specific fields (temporary per request)
  extraFields?: Record<string, string>;
}
