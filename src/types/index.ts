export type SeatStatus = "available" | "held" | "reserved";
export type StripeStatus = "pending" | "paid" | "failed" | "refunded";

export type MealChoice =
  | "lasagne"
  | "salade_grecque"
  | "1_boulette_frites"
  | "2_boulettes_frites";

export const MEAL_OPTIONS: { value: MealChoice; label: string; price: number }[] = [
  { value: "lasagne", label: "Lasagne", price: 2800 },
  { value: "salade_grecque", label: "Salade Grecque", price: 2800 },
  { value: "1_boulette_frites", label: "1 Boulette, Frites, Salade", price: 2800 },
  { value: "2_boulettes_frites", label: "2 Boulettes, Frites, Salade", price: 3000 },
];

export const DESSERT_PRICE = 450; // 4.50€ in cents
export const DESSERT_LABEL = "Panna Cotta";
export const VIP_TABLE_PRICE = 28000; // 280€ in cents

// Repas danseur options (separate from guest meals)
export const DANCER_MEAL_OPTIONS: { value: string; label: string; price: number }[] = [
  { value: "une_boulette", label: "1 Boulette, Frites, Salade", price: 1000 },
  { value: "lasagne_danseur", label: "Lasagne", price: 1000 },
  { value: "deux_boulettes", label: "2 Boulettes, Frites, Salade", price: 1200 },
];

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
  referentStudent: string;
  email: string;
  phone: string;
}

export function getMealPrice(meal: MealChoice): number {
  return MEAL_OPTIONS.find((m) => m.value === meal)?.price ?? 2800;
}

export function calculateTotal(data: BookingFormData): number {
  let total = data.isVip ? VIP_TABLE_PRICE : 0;

  if (!data.isVip) {
    for (const guest of data.guests) {
      total += getMealPrice(guest.mealChoice);
      if (guest.hasDessert) {
        total += DESSERT_PRICE;
      }
    }
  }

  // Dancer meals — each entry has its own mealChoice and price
  for (const upsell of data.upsells) {
    if (upsell.type === "repas_danseur" && upsell.mealChoice) {
      const opt = DANCER_MEAL_OPTIONS.find((o) => o.value === upsell.mealChoice);
      if (opt) total += opt.price * (upsell.quantity || 1);
    }
  }

  return total;
}
