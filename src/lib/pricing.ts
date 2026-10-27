/**
 * Tarifs en centimes. Le serveur est la seule source du montant encaissé.
 * Un plat inconnu n'a pas de prix de repli.
 */

export const DESSERT_PRICE = 450;
export const DESSERT_LABEL = "Panna cotta fruits rouges";
export const VIP_TABLE_PRICE = 28000;
export const VIP_PERSON_PRICE = 3500;
export const VIP_MEAL = "vip_inclus";
export const VIP_FORMULA =
  "Bouteille de mousseux pour la table et panna cotta fruits rouges par personne. Pas de plat.";

export const SALADE_DESCRIPTION =
  "Houmous de potiron, salade croquante, boulette falafel, pois chiches au cumin, feta, légumes rôtis";

export const MEAL_OPTIONS: { value: string; label: string; price: number; description?: string }[] = [
  { value: "lasagne", label: "Lasagne au poulet", price: 2800 },
  { value: "salade_saison", label: "Salade de saison", price: 2800, description: SALADE_DESCRIPTION },
  { value: "1_boulette_frites", label: "1 Boulette, Frites, Salade", price: 2800 },
  { value: "2_boulettes_frites", label: "2 Boulettes, Frites, Salade", price: 3000 },
];

export const DANCER_MEAL_OPTIONS: { value: string; label: string; price: number }[] = [
  { value: "une_boulette", label: "1 Boulette, Frites, Salade", price: 1000 },
  { value: "lasagne_danseur", label: "Lasagne au poulet", price: 1000 },
  { value: "deux_boulettes", label: "2 Boulettes, Frites, Salade", price: 1200 },
];

const LEGACY_MEAL_LABELS: Record<string, string> = {
  salade_grecque: "Salade de saison",
  vip_inclus: "Formule VIP (mousseux et dessert, sans plat)",
};

export const MAX_DANCER_LINES = 16;
export const MAX_DANCER_QTY = 8;

export function getMealPrice(meal: string): number | null {
  return MEAL_OPTIONS.find((item) => item.value === meal)?.price ?? null;
}

export function mealLabel(meal: string): string {
  return (
    MEAL_OPTIONS.find((item) => item.value === meal)?.label ??
    DANCER_MEAL_OPTIONS.find((item) => item.value === meal)?.label ??
    LEGACY_MEAL_LABELS[meal] ??
    meal
  );
}

export function shortMealLabel(meal: string): string {
  switch (meal) {
    case "2_boulettes_frites":
    case "deux_boulettes":
      return "2 Boulettes";
    case "1_boulette_frites":
    case "une_boulette":
      return "1 Boulette";
    case "salade_saison":
    case "salade_grecque":
      return "Salade de saison";
    case "lasagne":
    case "lasagne_danseur":
      return "Lasagne au poulet";
    case "vip_inclus":
      return "Sans plat";
    default:
      return mealLabel(meal);
  }
}

export function isBookableGuestMeal(meal: string): boolean {
  return getMealPrice(meal) !== null;
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
 * Table VIP : 280 €, sans plat, dessert inclus. Les repas danseur s'ajoutent.
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
      if (guest.mealChoice !== VIP_MEAL) {
        return { ok: false, error: "La table VIP n'inclut pas de plat" };
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
    const opt = DANCER_MEAL_OPTIONS.find((item) => item.value === upsell.mealChoice);
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
