import {
  DANCER_MEAL_OPTIONS,
  DESSERT_PRICE,
  MEAL_OPTIONS,
  VIP_MEAL,
  getMealPrice,
  isBookableGuestMeal,
} from "@/lib/pricing";

/**
 * Règle unique de modification des plats après paiement.
 *
 * `same-line-price` : une ligne ne peut passer qu'à un plat du même prix.
 * Le dessert ne s'ajoute ni ne se retire. Le montant déjà payé n'est jamais
 * recalculé. Lasagne au poulet, salade de saison et 1 boulette (28 €)
 * s'échangent. 2 boulettes, le dessert et un repas danseur d'un autre prix
 * restent figés.
 *
 * Pour une autre décision de la cliente, changer uniquement `mode` et le
 * comportement de ce fichier. Ne pas élargir la règle ailleurs : un plat
 * plus cher serait alors servi sans nouveau paiement.
 */
export const MEAL_EDIT_POLICY = {
  mode: "same-line-price",
} as const;

export type MealEditMode = (typeof MEAL_EDIT_POLICY)["mode"];

export const MEAL_EDIT_MESSAGE =
  "Seuls les plats au même prix peuvent être échangés : lasagne au poulet, salade de saison et 1 boulette (28 €). Le dessert, le passage à 2 boulettes et un repas danseur d'un autre prix ne sont pas modifiables. Le montant déjà payé ne change pas.";

export interface MealGuestEdit {
  id: number;
  mealChoice: string;
  hasDessert: boolean;
}

export interface MealUpsellEdit {
  id: number;
  mealChoice: string;
}

export interface CurrentMealGuest {
  id: number;
  mealChoice: string;
  hasDessert: boolean;
}

export interface CurrentMealUpsell {
  id: number;
  mealChoice: string | null;
}

export function guestLinePrice(mealChoice: string, hasDessert: boolean): number | null {
  const price = getMealPrice(mealChoice);
  if (price === null) return null;
  return price + (hasDessert ? DESSERT_PRICE : 0);
}

export function dancerLinePrice(mealChoice: string | null | undefined): number | null {
  if (!mealChoice) return null;
  return DANCER_MEAL_OPTIONS.find((option) => option.value === mealChoice)?.price ?? null;
}

/** Plats proposés dans le formulaire pour cette ligne, selon la règle en vigueur. */
export function editableGuestMeals(current: { mealChoice: string; hasDessert: boolean }) {
  switch (MEAL_EDIT_POLICY.mode) {
    case "same-line-price": {
      const price = getMealPrice(current.mealChoice);
      if (price === null) return [];
      return MEAL_OPTIONS.filter((meal) => meal.price === price);
    }
  }
}

export function editableDancerMeals(mealChoice: string | null | undefined) {
  switch (MEAL_EDIT_POLICY.mode) {
    case "same-line-price": {
      const price = dancerLinePrice(mealChoice);
      if (price === null) return [];
      return DANCER_MEAL_OPTIONS.filter((meal) => meal.price === price);
    }
  }
}

/** Le dessert est un supplément : la règle actuelle ne permet pas de le cocher après paiement. */
export function dessertEditable(): boolean {
  switch (MEAL_EDIT_POLICY.mode) {
    case "same-line-price":
      return false;
  }
}

function sameIds(current: number[], next: number[]): boolean {
  if (current.length !== next.length) return false;
  const wanted = [...current].sort((a, b) => a - b);
  const got = [...next].sort((a, b) => a - b);
  return wanted.every((id, index) => id === got[index]);
}

function sameGuestPrice(current: CurrentMealGuest, next: MealGuestEdit): boolean {
  switch (MEAL_EDIT_POLICY.mode) {
    case "same-line-price": {
      const before = guestLinePrice(current.mealChoice, current.hasDessert);
      const after = guestLinePrice(next.mealChoice, next.hasDessert);
      if (before === null || after === null) {
        return current.mealChoice === next.mealChoice && current.hasDessert === next.hasDessert;
      }
      return before === after;
    }
  }
}

function sameDancerPrice(current: string | null, next: string): boolean {
  switch (MEAL_EDIT_POLICY.mode) {
    case "same-line-price": {
      const before = dancerLinePrice(current);
      const after = dancerLinePrice(next);
      if (before === null || after === null) return (current ?? "") === next;
      return before === after;
    }
  }
}

/**
 * Contrôle une modification de plats : mêmes convives, mêmes lignes danseur,
 * aucun changement de place ni de quantité, et uniquement des échanges
 * autorisés par MEAL_EDIT_POLICY. Le montant payé n'est pas recalculé.
 */
export function validateMealEdit(input: {
  isVip: boolean;
  currentGuests: CurrentMealGuest[];
  currentUpsells: CurrentMealUpsell[];
  guests: MealGuestEdit[];
  upsells: MealUpsellEdit[];
}): { ok: true } | { ok: false; error: string } {
  if (!sameIds(input.currentGuests.map((guest) => guest.id), input.guests.map((guest) => guest.id))) {
    return { ok: false, error: "Les convives ne correspondent pas à la réservation" };
  }
  if (!sameIds(input.currentUpsells.map((upsell) => upsell.id), input.upsells.map((upsell) => upsell.id))) {
    return { ok: false, error: "Les repas danseur ne correspondent pas à la réservation" };
  }

  const guestsById = new Map(input.currentGuests.map((guest) => [guest.id, guest]));
  const upsellsById = new Map(input.currentUpsells.map((upsell) => [upsell.id, upsell]));

  for (const guest of input.guests) {
    const current = guestsById.get(guest.id);
    if (!current) return { ok: false, error: "Les convives ne correspondent pas à la réservation" };
    if (input.isVip) {
      if (guest.mealChoice !== VIP_MEAL || guest.hasDessert !== true) {
        return { ok: false, error: "La formule VIP reste sans plat, dessert inclus" };
      }
      continue;
    }
    if (!isBookableGuestMeal(guest.mealChoice)) {
      const unchanged = current.mealChoice === guest.mealChoice && current.hasDessert === guest.hasDessert;
      if (unchanged) continue;
      return { ok: false, error: "Choix de plat invalide" };
    }
    if (!sameGuestPrice(current, guest)) {
      return { ok: false, error: MEAL_EDIT_MESSAGE };
    }
  }

  for (const upsell of input.upsells) {
    const current = upsellsById.get(upsell.id);
    if (!current) return { ok: false, error: "Les repas danseur ne correspondent pas à la réservation" };
    const known = DANCER_MEAL_OPTIONS.some((option) => option.value === upsell.mealChoice);
    if (!known) {
      if ((current.mealChoice ?? "") === upsell.mealChoice) continue;
      return { ok: false, error: "Repas danseur invalide" };
    }
    if (!sameDancerPrice(current.mealChoice, upsell.mealChoice)) {
      return { ok: false, error: MEAL_EDIT_MESSAGE };
    }
  }

  return { ok: true };
}
