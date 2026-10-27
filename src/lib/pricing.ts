/**
 * Tarifs en centimes. Le serveur est la seule source du montant encaissé.
 * Un plat inconnu n'a pas de prix de repli.
 */

export const DESSERT_PRICE = 450;
export const DESSERT_LABEL = "Panna Cotta";
export const VIP_TABLE_PRICE = 28000;
export const VIP_MEAL = "vip_inclus";

export const MEAL_OPTIONS: { value: string; label: string; price: number }[] = [
  { value: "lasagne", label: "Lasagne", price: 2800 },
  { value: "salade_grecque", label: "Salade Grecque", price: 2800 },
  { value: "1_boulette_frites", label: "1 Boulette, Frites, Salade", price: 2800 },
  { value: "2_boulettes_frites", label: "2 Boulettes, Frites, Salade", price: 3000 },
];

export const DANCER_MEAL_OPTIONS: { value: string; label: string; price: number }[] = [
  { value: "une_boulette", label: "1 Boulette, Frites, Salade", price: 1000 },
  { value: "lasagne_danseur", label: "Lasagne", price: 1000 },
  { value: "deux_boulettes", label: "2 Boulettes, Frites, Salade", price: 1200 },
];

export const MAX_DANCER_LINES = 16;
export const MAX_DANCER_QTY = 8;

export function getMealPrice(meal: string): number | null {
  return MEAL_OPTIONS.find((m) => m.value === meal)?.price ?? null;
}

export function isKnownGuestMeal(meal: string): boolean {
  return getMealPrice(meal) !== null || meal === VIP_MEAL;
}

export interface QuoteGuest {
  mealChoice: string;
  hasDessert: boolean;
}

export interface QuoteUpsell {
  type: string;
  quantity: number;
  mealChoice?: string | null;
}

export type Quote =
  | { ok: true; total: number }
  | { ok: false; error: string };

/**
 * Calcule le total à partir du type de table déjà vérifié en base.
 * `isVip` ne doit jamais venir du navigateur.
 * Pour une table VIP, le forfait est 280 € ; les repas danseur s'ajoutent.
 * Les plats VIP historiques (carte) restent acceptés ici : le lot menu
 * imposera ensuite la formule sans plat.
 */
export function quoteBooking(input: {
  isVip: boolean;
  guests: QuoteGuest[];
  upsells: QuoteUpsell[];
}): Quote {
  if (input.guests.length < 1 || input.guests.length > 40) {
    return { ok: false, error: "Nombre de convives invalide" };
  }
  if (input.upsells.length > MAX_DANCER_LINES) {
    return { ok: false, error: "Trop de repas danseur" };
  }

  let total = input.isVip ? VIP_TABLE_PRICE : 0;

  for (const guest of input.guests) {
    if (input.isVip) {
      if (!isKnownGuestMeal(guest.mealChoice)) {
        return { ok: false, error: "Choix de plat invalide" };
      }
      continue;
    }
    if (guest.mealChoice === VIP_MEAL) {
      return { ok: false, error: "Formule VIP indisponible sur cette table" };
    }
    const price = getMealPrice(guest.mealChoice);
    if (price === null) {
      return { ok: false, error: "Choix de plat invalide" };
    }
    total += price;
    if (guest.hasDessert) total += DESSERT_PRICE;
  }

  for (const upsell of input.upsells) {
    if (upsell.type !== "repas_danseur") {
      return { ok: false, error: "Option inconnue" };
    }
    const qty = upsell.quantity;
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_DANCER_QTY) {
      return { ok: false, error: "Quantité de repas danseur invalide" };
    }
    const opt = DANCER_MEAL_OPTIONS.find((o) => o.value === upsell.mealChoice);
    if (!opt) {
      return { ok: false, error: "Repas danseur invalide" };
    }
    total += opt.price * qty;
  }

  if (!Number.isInteger(total) || total <= 0) {
    return { ok: false, error: "Montant invalide" };
  }
  return { ok: true, total };
}
