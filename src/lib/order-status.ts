export const orderStatuses = ["pending_payment", "confirmed", "draft_prepared", "preview_approved", "in_production", "dispatched", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const statusNames: Record<string, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Order confirmed",
  draft_prepared: "Preview ready",
  preview_approved: "Preview approved",
  in_production: "Hammering & threading",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** The five customer-facing stages of the live order tracker. */
export const progressStages = ["confirmed", "draft_prepared", "preview_approved", "in_production", "dispatched"] as const;

export const progressIndex = (status: string) => status === "delivered" ? progressStages.length : progressStages.indexOf(status as (typeof progressStages)[number]);

export const paymentNames: Record<string, string> = { pending: "Unpaid", paid: "Paid", failed: "Failed", refunded: "Refunded" };
