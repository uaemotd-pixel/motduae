export type PartnerPayoutKind = "tailor" | "fabric" | "shipping";

export type PartnerKindFilter = "all" | PartnerPayoutKind;

export type PaymentTab = "to-pay" | "in-progress" | "requests" | "history";

export const PAYMENT_TABS: PaymentTab[] = [
  "to-pay",
  "in-progress",
  "requests",
  "history",
];

export interface SettlementOrderLine {
  earningId: string;
  orderId: string;
  orderType: string;
  remainingFils: number;
  remainingAed: number;
  amount: number;
  netFils: number;
  netAed: number;
  grossFils: number;
  grossAed: number;
  commissionFils: number;
  commissionAed: number;
  commissionPercent: number;
  availableAt?: string | null;
  status: string;
}

export interface PartnerSettlement {
  partnerId: string;
  partnerKind: PartnerPayoutKind;
  partnerName: string;
  payeeName?: string;
  availableFils: number;
  availableAed: number;
  pendingFils: number;
  pendingAed: number;
  processingFils: number;
  processingAed: number;
  paidFils: number;
  paidAed: number;
  availableOrders: SettlementOrderLine[];
  pendingOrders: SettlementOrderLine[];
  contact?: string;
  email?: string;
  city?: string;
  location?: string;
  pickup?: string;
}

export interface PayoutOrderLine {
  earningId?: string;
  orderId: string;
  orderType: string;
  amount: number;
  amountFils?: number;
  amountAed?: number;
  commissionPercent?: number;
}

export interface PayoutLine extends PayoutOrderLine {
  earningId: string;
  amountFils: number;
  amountAed: number;
  commissionPercent: number;
}

export interface PartnerPayoutTransaction {
  _id: string;
  partnerId: string;
  partnerKind: PartnerPayoutKind;
  partnerName: string;
  payeeName?: string;
  amount: number;
  amountAed?: number;
  amountFils?: number;
  currency?: string;
  status?: string;
  bankRef?: string;
  note?: string;
  releasedAt: string;
  releasedBy?: { _id?: string; name?: string; email?: string } | string;
  lines?: PayoutLine[];
  orders?: PayoutOrderLine[];
}

export interface FifoPreview {
  amountFils: number;
  amountAed: number;
  lines: Array<{
    earningId: string;
    orderId: string;
    orderType: string;
    amountFils: number;
    amountAed: number;
    remainingAfterFils: number;
    remainingAfterAed: number;
    commissionPercent: number;
  }>;
}

export interface DashboardStats {
  currency: string;
  retail?: { orderCount: number; revenue: number; growth?: number };
  custom?: { orderCount: number; revenue: number; growth?: number };
  partnerShares?: {
    tailor?: { net?: number; commission?: number };
    fabricStore?: { net?: number; commission?: number };
    motdKeeps?: number;
    motdEarnings?: number;
  };
}

export type PayoutStatStatus = "pending" | "approved";

export interface FabricPayoutRequestItem {
  _id: string;
  partnerKey: string;
  partnerKind: PartnerPayoutKind;
  partnerId?: string;
  partnerName: string;
  payeeName?: string;
  amount: number;
  currency?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  note?: string;
  adminNote?: string;
  requestedAt?: string;
  reviewedAt?: string;
  orders?: Array<{
    orderId: string;
    orderType: string;
    amount: number;
  }>;
  requestedBy?: { _id?: string; name?: string; email?: string } | string;
}

export interface PayoutListResponse {
  items?: PartnerPayoutTransaction[];
  total?: number;
  page?: number;
  limit?: number;
}
