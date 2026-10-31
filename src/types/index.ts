import { quoteBooking, type QuoteGuest, type QuoteUpsell } from "@/lib/pricing";

export type SeatStatus = "available" | "held" | "reserved";
export type StripeStatus = "pending" | "paid" | "failed" | "refunded";

export type {
  QuoteGuest,
  QuoteUpsell,
} from "@/lib/pricing";

export {
  MEAL_OPTIONS,
  DANCER_MEAL_OPTIONS,
  DESSERT_PRICE,
  DESSERT_LABEL,
  VIP_TABLE_PRICE,
  VIP_MEAL,
  VIP_FORMULA,
  getMealPrice,
  mealLabel,
  shortMealLabel,
  quoteBooking,
} from "@/lib/pricing";

export type MealChoice =
  | "lasagne"
  | "salade_saison"
  | "salade_grecque"
  | "1_boulette_frites"
  | "2_boulettes_frites"
  | "vip_inclus";

// Only repas_danseur remains (champagne removed)
export const UPSELL_OPTIONS = [
  { type: "repas_danseur", label: "Repas Danseur" },
];

export interface SeatingRow {
  row: number;
  tables: number;
  isVip: boolean;
}

export const SEATING_PLAN: SeatingRow[] = [
  { row: 1, tables: 5, isVip: true },
  { row: 2, tables: 6, isVip: true },
  { row: 3, tables: 7, isVip: true },
  { row: 4, tables: 7, isVip: false },
  { row: 5, tables: 7, isVip: false },
  { row: 6, tables: 6, isVip: false },
  { row: 7, tables: 7, isVip: false },
  { row: 8, tables: 5, isVip: false },
  { row: 9, tables: 5, isVip: false },
];

export interface TableWithSeats {
  id: number;
  eventId: number;
  rowNumber: number;
  tableNumber: number;
  seatCount: number;
  isVip: boolean;
  seats: SeatData[];
}

export interface SeatData {
  id: number;
  tableId: number;
  seatNumber: number;
  status: SeatStatus;
}

export interface EventData {
  id: number;
  name: string;
  eventDate: string;
  timeInfo: string;
  ageGroup: string;
  description: string | null;
  isActive: boolean;
}

export interface SeatFormData {
  seatId: number;
  firstName: string;
  lastName: string;
  mealChoice: MealChoice;
  hasDessert: boolean;
}

export interface BookingFormData {
  eventId: number;
  tableId: number;
  seatIds: number[];
  isVip: boolean;
  guests: SeatFormData[];
  upsells: { type: string; quantity: number; mealChoice?: string }[];
  referentLastName: string;
  referentFirstName: string;
  email: string;
  phone: string;
}

const ROW_OFFSETS: Record<number, number> = (() => {
  const offsets: Record<number, number> = {};
  let cumulative = 0;
  for (const row of SEATING_PLAN) {
    offsets[row.row] = cumulative;
    cumulative += row.tables;
  }
  return offsets;
})();

export function getTableLabel(rowNumber: number, tableNumber: number): number {
  return (ROW_OFFSETS[rowNumber] ?? 0) + tableNumber;
}

export function getSeatLabel(seatNumber: number): string {
  return String.fromCharCode(64 + seatNumber);
}

export function calculateTotal(data: Pick<BookingFormData, "isVip" | "guests" | "upsells">): number {
  const quoted = quoteBooking({
    isVip: data.isVip,
    guests: data.guests satisfies QuoteGuest[],
    upsells: data.upsells satisfies QuoteUpsell[],
  });
  return quoted.ok ? quoted.total : 0;
}
