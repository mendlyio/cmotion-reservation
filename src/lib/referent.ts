/** Nom et prénom de l'élève référent, avec repli sur l'ancienne colonne unique. */

export interface ReferentSource {
  referentStudent?: string | null;
  referentLastName?: string | null;
  referentFirstName?: string | null;
}

export interface ReferentParts {
  lastName: string;
  firstName: string;
}

export const REFERENT_CSV_HEADERS = [
  "Nom de l'élève référent",
  "Prénom de l'élève référent",
] as const;

function clean(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

/** Parties séparées. Sans colonnes nouvelles, l'ancienne saisie tient lieu de nom. */
export function referentParts(source: ReferentSource): ReferentParts {
  const lastName = clean(source.referentLastName);
  const firstName = clean(source.referentFirstName);
  if (lastName || firstName) return { lastName, firstName };
  return { lastName: clean(source.referentStudent), firstName: "" };
}

export function hasSplitReferent(source: ReferentSource): boolean {
  return Boolean(clean(source.referentLastName) || clean(source.referentFirstName));
}

/** Affichage accueil : nom, puis prénom. */
export function formatReferentDisplay(source: ReferentSource): string {
  const { lastName, firstName } = referentParts(source);
  return [lastName, firstName].filter(Boolean).join(" ");
}

export function referentMailLines(source: ReferentSource): { label: string; value: string }[] {
  if (hasSplitReferent(source)) {
    return [
      { label: "Nom de l'élève référent", value: clean(source.referentLastName) },
      { label: "Prénom de l'élève référent", value: clean(source.referentFirstName) },
    ];
  }
  return [{ label: "Élève référent", value: clean(source.referentStudent) }];
}

export function referentCsvCells(source: ReferentSource): [string, string] {
  const { lastName, firstName } = referentParts(source);
  return [lastName, firstName];
}

/** Tri d'accueil : nom, puis prénom, sans tenir compte de la casse ni des accents. */
export function compareReferentNames(a: ReferentSource, b: ReferentSource): number {
  const left = referentParts(a);
  const right = referentParts(b);
  const byLast = left.lastName.localeCompare(right.lastName, "fr", { sensitivity: "base" });
  if (byLast !== 0) return byLast;
  return left.firstName.localeCompare(right.firstName, "fr", { sensitivity: "base" });
}

export function sortByReferentName<T extends ReferentSource & { id: number }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const byName = compareReferentNames(a, b);
    if (byName !== 0) return byName;
    return a.id - b.id;
  });
}
