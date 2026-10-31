import { shortMealLabel } from "@/lib/pricing";

export type PictoKey = "deux" | "une" | "salade" | "lasagne" | "dessert";

export interface SheetGuest {
  tableNumber: number;
  place: string;
  mealChoice: string;
  hasDessert: boolean;
}

export interface SheetExtra {
  mealChoice: string;
  quantity: number;
}

export interface FicheRow {
  place: string;
  meal: string;
  dessert: string;
  extra: string;
}

export interface ReservationFiche {
  title: string;
  referentLastName: string;
  referentFirstName: string;
  tablesLabel: string;
  rows: FicheRow[];
}

export interface RecapLine {
  key: PictoKey;
  label: string;
  parents: number;
  eleves: number;
}

export interface TableRecap {
  title: string;
  tableNumber: number;
  lines: RecapLine[];
}

const PARENT_KEY: Record<string, PictoKey> = {
  "2_boulettes_frites": "deux",
  "1_boulette_frites": "une",
  salade_saison: "salade",
  salade_grecque: "salade",
  lasagne: "lasagne",
};

const ELEVE_KEY: Record<string, PictoKey> = {
  deux_boulettes: "deux",
  une_boulette: "une",
  lasagne_danseur: "lasagne",
};

export function tablesLabel(numbers: number[]): string {
  const unique = [...new Set(numbers)].sort((a, b) => a - b);
  if (unique.length === 0) return "Table";
  if (unique.length === 1) return `Table ${unique[0]}`;
  if (unique.length === 2) return `Tables ${unique[0]} et ${unique[1]}`;
  const last = unique[unique.length - 1];
  return `Tables ${unique.slice(0, -1).join(", ")} et ${last}`;
}

/** Table qui porte les repas élève : la plus nombreuse, sinon le plus petit numéro. */
export function dominantTable(guests: SheetGuest[]): number | null {
  if (guests.length === 0) return null;
  const counts = new Map<number, number>();
  for (const guest of guests) {
    counts.set(guest.tableNumber, (counts.get(guest.tableNumber) ?? 0) + 1);
  }
  let best = guests[0].tableNumber;
  let bestCount = -1;
  for (const [table, count] of counts) {
    if (count > bestCount || (count === bestCount && table < best)) {
      best = table;
      bestCount = count;
    }
  }
  return best;
}

function expandExtras(extras: SheetExtra[]): string[] {
  const labels: string[] = [];
  for (const extra of extras) {
    const label = shortMealLabel(extra.mealChoice);
    const qty = Number.isInteger(extra.quantity) && extra.quantity > 0 ? extra.quantity : 0;
    for (let i = 0; i < qty; i++) labels.push(label);
  }
  return labels;
}

export function buildFiche(input: {
  timeInfo: string;
  referent: string;
  referentLastName?: string;
  referentFirstName?: string;
  guests: SheetGuest[];
  extras: SheetExtra[];
}): ReservationFiche {
  const extras = expandExtras(input.extras);
  const guests = [...input.guests].sort((a, b) => a.place.localeCompare(b.place, "fr", { numeric: true }));
  const rowCount = Math.max(guests.length, extras.length, 1);
  const rows: FicheRow[] = [];
  for (let i = 0; i < rowCount; i++) {
    const guest = guests[i];
    rows.push({
      place: guest?.place ?? "",
      meal: guest ? shortMealLabel(guest.mealChoice) : "",
      dessert: guest?.hasDessert ? "Oui" : "",
      extra: extras[i] ?? "",
    });
  }
  return {
    title: `${input.timeInfo} ${input.referent}`.trim(),
    referentLastName: input.referentLastName?.trim() ?? "",
    referentFirstName: input.referentFirstName?.trim() ?? "",
    tablesLabel: tablesLabel(guests.map((guest) => guest.tableNumber)),
    rows,
  };
}

function emptyLines(): RecapLine[] {
  return [
    { key: "deux", label: "2 boulettes", parents: 0, eleves: 0 },
    { key: "une", label: "1 boulette", parents: 0, eleves: 0 },
    { key: "salade", label: "Salade de saison", parents: 0, eleves: 0 },
    { key: "lasagne", label: "Lasagne au poulet", parents: 0, eleves: 0 },
    { key: "dessert", label: "Dessert", parents: 0, eleves: 0 },
  ];
}

export function buildRecaps(input: {
  timeInfo: string;
  reservations: { guests: SheetGuest[]; extras: SheetExtra[] }[];
}): TableRecap[] {
  const byTable = new Map<number, RecapLine[]>();
  const ensure = (table: number) => {
    const existing = byTable.get(table);
    if (existing) return existing;
    const lines = emptyLines();
    byTable.set(table, lines);
    return lines;
  };
  const add = (table: number, key: PictoKey, side: "parents" | "eleves", amount = 1) => {
    const line = ensure(table).find((item) => item.key === key);
    if (line) line[side] += amount;
  };

  for (const reservation of input.reservations) {
    for (const guest of reservation.guests) {
      const key = PARENT_KEY[guest.mealChoice];
      if (key) add(guest.tableNumber, key, "parents");
      if (guest.hasDessert) add(guest.tableNumber, "dessert", "parents");
    }
    const table = dominantTable(reservation.guests);
    if (table === null) continue;
    for (const extra of reservation.extras) {
      const key = ELEVE_KEY[extra.mealChoice];
      if (!key) continue;
      const qty = Number.isInteger(extra.quantity) && extra.quantity > 0 ? extra.quantity : 0;
      add(table, key, "eleves", qty);
    }
  }

  return [...byTable.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tableNumber, lines]) => ({
      title: `${input.timeInfo} Table ${tableNumber}`,
      tableNumber,
      lines,
    }));
}
