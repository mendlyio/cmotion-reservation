import { DANCER_MEAL_OPTIONS, VIP_MEAL, isBookableGuestMeal } from "@/lib/pricing";

export interface MealGuestEdit {
  id: number;
  mealChoice: string;
  hasDessert: boolean;
}

export interface MealUpsellEdit {
  id: number;
  mealChoice: string;
}

function sameIds(current: number[], next: number[]): boolean {
  if (current.length !== next.length) return false;
  const wanted = [...current].sort((a, b) => a - b);
  const got = [...next].sort((a, b) => a - b);
  return wanted.every((id, index) => id === got[index]);
}

/**
 * Contrôle une modification de plats : mêmes convives, mêmes lignes danseur,
 * aucun changement de place ni de quantité. Le montant payé n'est pas recalculé.
 */
export function validateMealEdit(input: {
  isVip: boolean;
  currentGuestIds: number[];
  currentUpsellIds: number[];
  guests: MealGuestEdit[];
  upsells: MealUpsellEdit[];
}): { ok: true } | { ok: false; error: string } {
  if (!sameIds(input.currentGuestIds, input.guests.map((guest) => guest.id))) {
    return { ok: false, error: "Les convives ne correspondent pas à la réservation" };
  }
  if (!sameIds(input.currentUpsellIds, input.upsells.map((upsell) => upsell.id))) {
    return { ok: false, error: "Les repas danseur ne correspondent pas à la réservation" };
  }

  for (const guest of input.guests) {
    if (input.isVip) {
      if (guest.mealChoice !== VIP_MEAL || guest.hasDessert !== true) {
        return { ok: false, error: "La formule VIP reste sans plat, dessert inclus" };
      }
      continue;
    }
    if (!isBookableGuestMeal(guest.mealChoice)) {
      return { ok: false, error: "Choix de plat invalide" };
    }
  }

  for (const upsell of input.upsells) {
    if (!DANCER_MEAL_OPTIONS.some((option) => option.value === upsell.mealChoice)) {
      return { ok: false, error: "Repas danseur invalide" };
    }
  }

  return { ok: true };
}
