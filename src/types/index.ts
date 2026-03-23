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
export const VIP_TABLE_PRICE = 28000; // 280€ in cents

export const UPSELL_OPTIONS = [
  { type: "repas_danseur", label: "Repas Danseur", price: 2800 },
  { type: "champagne", label: "Bouteille de Champagne", price: 3500 },
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
  upsells: { type: string; quantity: number }[];
  referentStudent: string;
  email: string;
  phone: string;
}

export function getMealPrice(meal: MealChoice): number {
  return MEAL_OPTIONS.find((m) => m.value === meal)?.price ?? 2800;
}

export function calculateTotal(data: BookingFormData): number {
  if (data.isVip) {
    return VIP_TABLE_PRICE;
  }

  let total = 0;
  for (const guest of data.guests) {
    total += getMealPrice(guest.mealChoice);
    if (guest.hasDessert) {
      total += DESSERT_PRICE;
    }
  }

  for (const upsell of data.upsells) {
    const option = UPSELL_OPTIONS.find((o) => o.type === upsell.type);
    if (option) {
      total += option.price * upsell.quantity;
    }
  }

  return total;
}
