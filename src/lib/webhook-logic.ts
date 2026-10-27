export type ReservationStatus = "pending" | "paid" | "failed" | "refunded";

export type CompletedDecision =
  | { type: "already_paid" }
  | { type: "ignore_unpaid" }
  | { type: "mark_paid" }
  | { type: "mark_paid_without_seats" }
  | {
      type: "alert";
      reason: "missing_reservation" | "amount_mismatch" | "currency" | "late_payment" | "paid_without_seats";
    };

export function decideCheckoutCompleted(input: {
  reservationFound: boolean;
  status: ReservationStatus | null;
  expectedAmount: number | null;
  amountTotal: number | null;
  paymentStatus: string | null;
  currency: string | null;
  hasSeats: boolean;
}): CompletedDecision {
  if (!input.reservationFound || input.status === null) {
    return { type: "alert", reason: "missing_reservation" };
  }
  if (input.paymentStatus !== "paid") {
    return { type: "ignore_unpaid" };
  }
  if (input.currency !== "eur") {
    return { type: "alert", reason: "currency" };
  }
  if (
    input.amountTotal === null ||
    input.expectedAmount === null ||
    input.amountTotal !== input.expectedAmount
  ) {
    return { type: "alert", reason: "amount_mismatch" };
  }
  if (input.status === "paid") {
    if (!input.hasSeats) return { type: "alert", reason: "paid_without_seats" };
    return { type: "already_paid" };
  }
  if (input.status === "pending") {
    if (!input.hasSeats) return { type: "mark_paid_without_seats" };
    return { type: "mark_paid" };
  }
  return { type: "alert", reason: "late_payment" };
}

export function decideCheckoutExpired(status: ReservationStatus | null): "fail" | "ignore" {
  return status === "pending" ? "fail" : "ignore";
}
