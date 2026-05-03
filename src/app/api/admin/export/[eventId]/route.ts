import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  events,
  reservations,
  reservationSeats,
  reservationUpsells,
  seats,
  tables,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { verifyAdmin } from "@/lib/admin";
import {
  MEAL_OPTIONS,
  DANCER_MEAL_OPTIONS,
  DESSERT_LABEL,
  DESSERT_PRICE,
  UPSELL_OPTIONS,
  getTableLabel,
  getSeatLabel,
  getMealPrice,
  type MealChoice,
} from "@/types";

const STRIPE_STATUS_FR: Record<string, string> = {
  pending: "En attente de paiement",
  paid: "Payé",
  failed: "Paiement échoué",
  refunded: "Remboursé",
};

const SEAT_STATUS_FR: Record<string, string> = {
  available: "Disponible",
  held: "Blocage temporaire (panier)",
  reserved: "Réservée (vendue)",
};

function eurLabel(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatDateFr(isoDate: Date | string): string {
  const d = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function upsellTypeLabel(type: string): string {
  return UPSELL_OPTIONS.find((o) => o.type === type)?.label || type.replace(/_/g, " ");
}

function escapeCsvCell(cell: string): string {
  return `"${cell.replace(/"/g, '""')}"`;
}

function formatCsvRow(row: string[]): string {
  return row.map(escapeCsvCell).join(",");
}

type UpsellRow = (typeof reservationUpsells.$inferSelect);

function upsellDetail(u: Pick<UpsellRow, "upsellType" | "mealChoice">): string {
  if (u.upsellType === "repas_danseur" && u.mealChoice) {
    return DANCER_MEAL_OPTIONS.find((o) => o.value === u.mealChoice)?.label ?? u.mealChoice;
  }
  return u.mealChoice || "";
}

function recapLine(row: readonly string[]): string {
  if (row.length === 0) return "";
  if (row.length === 1) return escapeCsvCell(row[0]);
  return formatCsvRow(Array.from(row));
}

function mealCatalogPriceEur(mealChoice: string): string {
  const known = MEAL_OPTIONS.some((m) => m.value === mealChoice);
  if (!known) return "";
  return eurLabel(getMealPrice(mealChoice as MealChoice));
}

function eventDateIso(event: typeof events.$inferSelect): string {
  const d = event.eventDate;
  return typeof d === "string" ? d : (d as Date).toISOString().slice(0, 10);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId: eidStr } = await params;
  const eventId = parseInt(eidStr);

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const spectacleDate = new Date(event.eventDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const openAtLabel =
    event.openAt == null ? "Non définie (ouvert manuel)" : `${formatDateFr(event.openAt)} (référence UTC)`;

  const specDateIso = eventDateIso(event);

  const eventReservations = await db
    .select()
    .from(reservations)
    .where(eq(reservations.eventId, eventId));

  const paidReservations = eventReservations.filter((r) => r.stripeStatus === "paid");
  const unpaidReservations = eventReservations.filter((r) => r.stripeStatus !== "paid");

  const headerLines: string[] = [
    formatCsvRow(["Titre du fichier", "EXPORT CMOTION — CSV complet par spectacle"]),
    formatCsvRow([
      "Structure",
      "1) Fiche spectacle · 2) Statistiques · 3) Synthèse (1 ligne / réservation payée) · 4) Convives & plan de salle · 5) Récap traiteur · 6) Options (détail + agrégat) · 7) Réservations non payées si présentes",
    ]),
    formatCsvRow(["Document généré le", formatDateFr(new Date())]),
    "",
    "FICHE SPECTACLE",
    formatCsvRow(["Identifiant spectacle", String(event.id)]),
    formatCsvRow(["Nom du spectacle", event.name]),
    formatCsvRow(["Date du spectacle (affichage)", spectacleDate]),
    formatCsvRow(["Date du spectacle (ISO)", specDateIso]),
    formatCsvRow(["Créneau / infos horaires", event.timeInfo]),
    formatCsvRow(["Tranche d'âge du spectacle", event.ageGroup]),
    formatCsvRow(["Description", (event.description || "").replace(/\r?\n/g, " ")]),
    formatCsvRow(["Réservations ouvertes sur le site", event.isActive ? "Oui" : "Non"]),
    formatCsvRow(["Spectacle créé dans l'outil le", formatDateFr(event.createdAt)]),
    formatCsvRow(["Ouverture auto des réservations (UTC)", openAtLabel]),
    "",
  ];

  if (paidReservations.length === 0) {
    headerLines.push(
      "STATISTIQUES",
      formatCsvRow(["Réservations payées", "0"]),
      formatCsvRow(["Places convives payées", "0"]),
      formatCsvRow(["Montant total encaissé (€)", "0,00"]),
      ""
    );
    if (unpaidReservations.length > 0) {
      headerLines.push(
        "RÉSERVATIONS NON PAYÉES (aperçu — non incluses dans les listes convives)",
        formatCsvRow([
          "Id rés.",
          "Statut paiement",
          "Créée le",
          "Élève référent",
          "Email",
          "Tél.",
          "Montant (€)",
          "Id session Stripe Checkout",
        ]),
        ...unpaidReservations
          .sort((a, b) => b.id - a.id)
          .map((r) =>
            formatCsvRow([
              String(r.id),
              STRIPE_STATUS_FR[r.stripeStatus] ?? r.stripeStatus,
              formatDateFr(r.createdAt),
              r.referentStudent,
              r.email,
              r.phone || "",
              eurLabel(r.totalAmount),
              r.stripePaymentId || "",
            ])
          ),
        ""
      );
    }
    headerLines.push(formatCsvRow(["Message", "Aucune réservation payée pour ce spectacle."]));
    const bom = "\uFEFF";
    const dateSlug = event.eventDate;
    const nameSlug = event.name.replace(/\s+/g, "-").toLowerCase();
    const csv = bom + headerLines.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cmotion-${nameSlug}-${dateSlug}-complet.csv"`,
      },
    });
  }

  const resIds = paidReservations.map((r) => r.id);

  const allGuests = await db
    .select()
    .from(reservationSeats)
    .where(inArray(reservationSeats.reservationId, resIds));

  const allUpsells = await db
    .select()
    .from(reservationUpsells)
    .where(inArray(reservationUpsells.reservationId, resIds));

  const seatIds = allGuests.map((g) => g.seatId);
  const seatMap: Record<number, { seatNumber: number; tableId: number; status: string }> = {};
  const tableMap: Record<
    number,
    { rowNumber: number; tableNumber: number; isVip: boolean; seatCount: number }
  > = {};

  if (seatIds.length > 0) {
    const seatDetails = await db
      .select({
        id: seats.id,
        seatNumber: seats.seatNumber,
        tableId: seats.tableId,
        status: seats.status,
      })
      .from(seats)
      .where(inArray(seats.id, seatIds));

    for (const s of seatDetails)
      seatMap[s.id] = { seatNumber: s.seatNumber, tableId: s.tableId, status: s.status };

    const tableIds = [...new Set(seatDetails.map((s) => s.tableId))];
    const tableDetails = await db
      .select({
        id: tables.id,
        rowNumber: tables.rowNumber,
        tableNumber: tables.tableNumber,
        isVip: tables.isVip,
        seatCount: tables.seatCount,
      })
      .from(tables)
      .where(inArray(tables.id, tableIds));

    for (const t of tableDetails)
      tableMap[t.id] = {
        rowNumber: t.rowNumber,
        tableNumber: t.tableNumber,
        isVip: t.isVip,
        seatCount: t.seatCount,
      };
  }

  const resMap: Record<number, (typeof paidReservations)[0]> = {};
  for (const r of paidReservations) resMap[r.id] = r;

  const paidReservationOrder = [...paidReservations].sort((a, b) => {
    const ca = new Date(a.createdAt).getTime();
    const cb = new Date(b.createdAt).getTime();
    if (ca !== cb) return ca - cb;
    return a.id - b.id;
  });
  const reservationChronology = new Map<number, number>();
  paidReservationOrder.forEach((r, idx) => reservationChronology.set(r.id, idx));

  const guestCountByRes: Record<number, number> = {};
  for (const g of allGuests) {
    guestCountByRes[g.reservationId] = (guestCountByRes[g.reservationId] || 0) + 1;
  }

  const upsellsByRes: Record<number, string[]> = {};
  for (const u of allUpsells) {
    const detail = upsellDetail(u);
    const line =
      detail.length > 0
        ? `${upsellTypeLabel(u.upsellType)} (${detail}) ×${u.quantity}`
        : `${upsellTypeLabel(u.upsellType)} ×${u.quantity}`;
    if (!upsellsByRes[u.reservationId]) upsellsByRes[u.reservationId] = [];
    upsellsByRes[u.reservationId].push(line);
  }

  const cmpHall = (
    sa: { seatNumber: number; tableId: number } | undefined,
    sb: { seatNumber: number; tableId: number } | undefined
  ) => {
    const ta = sa ? tableMap[sa.tableId] : null;
    const tb = sb ? tableMap[sb.tableId] : null;
    if (ta && tb) {
      if (ta.rowNumber !== tb.rowNumber) return ta.rowNumber - tb.rowNumber;
      if (ta.tableNumber !== tb.tableNumber) return ta.tableNumber - tb.tableNumber;
    }
    return (sa?.seatNumber ?? 0) - (sb?.seatNumber ?? 0);
  };

  const sortedGuests = [...allGuests].sort((a, b) => {
    const oa = reservationChronology.get(a.reservationId) ?? 0;
    const ob = reservationChronology.get(b.reservationId) ?? 0;
    if (oa !== ob) return oa - ob;
    return cmpHall(seatMap[a.seatId], seatMap[b.seatId]);
  });

  let lastResForIndex = -1;
  let partyIndex = 0;

  const guestHeaders = [
    "Id spectacle",
    "Nom du spectacle",
    "Date spectacle (ISO)",
    "Id ligne convive (base de données)",
    "Statut paiement de la réservation",
    "Id réservation",
    "Réservation créée le",
    "Id session Stripe Checkout",
    "Nombre de convives dans la réservation",
    "Position du convive dans le groupe (ex. 2/4)",
    "Élève référent / contact principal",
    "Email de contact",
    "Téléphone",
    "Notes internes (niveau réservation)",
    "Type de table (VIP ou standard)",
    "Rang dans la salle",
    "Numéro de table sur le plan",
    "Libellé du siège (plan)",
    "Capacité sièges de la table (plan)",
    "Id technique table",
    "Id technique siège",
    "Code état siège (BDD)",
    "État du siège (libellé)",
    "Prénom du convive",
    "Nom du convive",
    "Repas choisi (libellé)",
    "Code repas brut (si besoin d'export technique)",
    "Tarif catalogue plat convive (€, grille actuelle)",
    "Dessert inclus",
    "Tarif catalogue dessert si inclus (€, grille actuelle)",
    "Liste des options facturées sur la réservation",
    "Montant total payé pour la réservation (€)",
    "Notes internes (niveau convive / place)",
  ];

  const guestRows = sortedGuests.map((g) => {
    const isFirstOfReservation = g.reservationId !== lastResForIndex;
    if (isFirstOfReservation) {
      lastResForIndex = g.reservationId;
      partyIndex = 0;
    }
    partyIndex += 1;
    const seat = seatMap[g.seatId];
    const table = seat ? tableMap[seat.tableId] : null;
    const res = resMap[g.reservationId];
    const meal = MEAL_OPTIONS.find((m) => m.value === g.mealChoice)?.label || g.mealChoice;
    const nGuests = guestCountByRes[g.reservationId] || 0;

    const dessertCell = g.hasDessert ? `Oui (${DESSERT_LABEL})` : "Non";
    // Options affichées uniquement sur la 1ère ligne de chaque réservation pour éviter les doublons visuels
    const optionsList = isFirstOfReservation
      ? (upsellsByRes[g.reservationId] || []).join(" ; ")
      : "";
    const seatStatusCode = seat?.status ?? "";
    const seatStatusFr = seat ? SEAT_STATUS_FR[seat.status] ?? seat.status : "";

    return [
      String(event.id),
      event.name,
      specDateIso,
      String(g.id),
      res ? STRIPE_STATUS_FR[res.stripeStatus] ?? res.stripeStatus : "",
      String(g.reservationId),
      res ? formatDateFr(res.createdAt) : "",
      res?.stripePaymentId || "",
      String(nGuests),
      `${partyIndex}/${nGuests || "?"}`,
      res?.referentStudent || "",
      res?.email || "",
      res?.phone || "",
      res?.adminNotes?.replace(/\r?\n/g, " ") || "",
      table?.isVip ? "VIP" : "Standard",
      table ? String(table.rowNumber) : "",
      table ? String(getTableLabel(table.rowNumber, table.tableNumber)) : "",
      seat ? getSeatLabel(seat.seatNumber) : "",
      table ? String(table.seatCount) : "",
      seat ? String(seat.tableId) : "",
      String(g.seatId),
      seatStatusCode,
      seatStatusFr,
      g.firstName,
      g.lastName,
      meal,
      g.mealChoice,
      mealCatalogPriceEur(g.mealChoice),
      dessertCell,
      g.hasDessert ? eurLabel(DESSERT_PRICE) : "",
      optionsList,
      res ? eurLabel(res.totalAmount) : "",
      g.adminNotes?.replace(/\r?\n/g, " ") || "",
    ];
  });

  const totalRevenue = paidReservations.reduce((sum, r) => sum + r.totalAmount, 0);
  const vipGuestRows = sortedGuests.filter((g) => {
    const seat = seatMap[g.seatId];
    const table = seat ? tableMap[seat.tableId] : null;
    return table?.isVip;
  });
  const standardGuestRows = sortedGuests.filter((g) => {
    const seat = seatMap[g.seatId];
    const table = seat ? tableMap[seat.tableId] : null;
    return table && !table.isVip;
  });

  const mealTotals: Record<string, number> = {};
  let dessertTotal = 0;
  for (const g of allGuests) {
    const label = MEAL_OPTIONS.find((m) => m.value === g.mealChoice)?.label || g.mealChoice;
    mealTotals[label] = (mealTotals[label] || 0) + 1;
    if (g.hasDessert) dessertTotal++;
  }

  const dancerTotals: Record<string, number> = {};
  for (const u of allUpsells) {
    if (u.upsellType === "repas_danseur" && u.mealChoice) {
      const label = DANCER_MEAL_OPTIONS.find((o) => o.value === u.mealChoice)?.label || u.mealChoice;
      dancerTotals[label] = (dancerTotals[label] || 0) + u.quantity;
    }
  }

  const sortedUpsells = [...allUpsells].sort((a, b) => {
    const ra = reservationChronology.get(a.reservationId) ?? Number.MAX_SAFE_INTEGER;
    const rb = reservationChronology.get(b.reservationId) ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.id - b.id;
  });

  const synthHeaders = [
    "Id spectacle",
    "Nom du spectacle",
    "Date spectacle (ISO)",
    "Ordre de réservation (chronologique)",
    "Statut paiement",
    "Id réservation",
    "Réservation créée le",
    "Élève référent / contact principal",
    "Email",
    "Téléphone",
    "Nombre de convives",
    "Montant total payé (€)",
    "Id session Stripe Checkout",
    "Options et suppléments (résumé texte)",
    "Notes internes réservation",
  ];
  const nPaid = paidReservationOrder.length;
  const synthRows = paidReservationOrder.map((r, idx) =>
    formatCsvRow([
      String(event.id),
      event.name,
      specDateIso,
      `${idx + 1}/${nPaid}`,
      STRIPE_STATUS_FR[r.stripeStatus] ?? r.stripeStatus,
      String(r.id),
      formatDateFr(r.createdAt),
      r.referentStudent,
      r.email,
      r.phone || "",
      String(guestCountByRes[r.id] ?? 0),
      eurLabel(r.totalAmount),
      r.stripePaymentId || "",
      (upsellsByRes[r.id] || []).join(" ; "),
      r.adminNotes?.replace(/\r?\n/g, " ") || "",
    ])
  );

  const upsellDetailHeaders = [
    "Id spectacle",
    "Nom du spectacle",
    "Date spectacle (ISO)",
    "Id ligne option (base de données)",
    "Id réservation",
    "Élève référent",
    "Email réservation",
    "Type de l'option",
    "Détail (plat / variante sélectionné)",
    "Quantité",
    "Prix unitaire facturé (€)",
    "Montant de la ligne (€)",
    "Code type brut (pour contrôle CRM)",
    "Choix détail brut (pour contrôle CRM)",
  ];
  const upsellDetailRows = sortedUpsells.map((u) => {
    const rr = resMap[u.reservationId];
    return formatCsvRow([
      String(event.id),
      event.name,
      specDateIso,
      String(u.id),
      String(u.reservationId),
      rr?.referentStudent || "",
      rr?.email || "",
      upsellTypeLabel(u.upsellType),
      upsellDetail(u),
      String(u.quantity),
      eurLabel(u.unitPrice),
      eurLabel(u.unitPrice * u.quantity),
      u.upsellType,
      u.mealChoice || "",
    ]);
  });

  type UpsellAgg = { typeLabel: string; detail: string; qty: number; cents: number };
  const upsellAggMap = new Map<string, UpsellAgg>();
  for (const u of allUpsells) {
    const key = `${u.upsellType}\u0001${u.mealChoice ?? ""}`;
    const prev = upsellAggMap.get(key);
    const addQty = u.quantity;
    const addCents = u.unitPrice * u.quantity;
    const typeLabel = upsellTypeLabel(u.upsellType);
    const detail = upsellDetail(u);
    if (prev) {
      prev.qty += addQty;
      prev.cents += addCents;
    } else {
      upsellAggMap.set(key, { typeLabel, detail, qty: addQty, cents: addCents });
    }
  }
  const upsellAggHeaders = [
    "Type d'option (libellé)",
    "Détail / variante",
    "Quantité totale vendue (lignes additionnées)",
    "Montant total facturé (€)",
  ];
  const upsellAggRows = [...upsellAggMap.values()]
    .sort((a, b) => {
      const c = a.typeLabel.localeCompare(b.typeLabel, "fr");
      if (c !== 0) return c;
      return a.detail.localeCompare(b.detail, "fr");
    })
    .map((v) => formatCsvRow([v.typeLabel, v.detail, String(v.qty), eurLabel(v.cents)]));

  const recapRows: string[][] = [
    [],
    ["RÉCAPITULATIF TRAITEUR (réservations payées uniquement)"],
    [],
    ["Indicateur", "Valeur"],
    ["Réservations payées", String(paidReservations.length)],
    ["Nombre de convives / places vendues", String(allGuests.length)],
    [`Tables VIP (places)`, String(vipGuestRows.length)],
    [`Tables standard (places)`, String(standardGuestRows.length)],
    ["Montant total encaissé (€)", eurLabel(totalRevenue)],
    [],
    ["Plat convive", "Quantité"],
    ...Object.entries(mealTotals)
      .sort(([a], [b]) => a.localeCompare(b, "fr"))
      .map(([label, count]) => [label, count.toString()]),
    [`Dessert (${DESSERT_LABEL}) — convives concernés`, dessertTotal.toString()],
  ];

  if (Object.keys(dancerTotals).length > 0) {
    recapRows.push([]);
    recapRows.push(["Repas danseur (détail)", "Quantité"]);
    for (const [label, count] of Object.entries(dancerTotals).sort(([a], [b]) =>
      a.localeCompare(b, "fr")
    )) {
      recapRows.push([label, count.toString()]);
    }
  }

  const csvLines: string[] = [
    ...headerLines,
    "STATISTIQUES (réservations payées)",
    formatCsvRow(["Réservations payées", String(paidReservations.length)]),
    formatCsvRow(["Places convives vendues", String(allGuests.length)]),
    formatCsvRow(["Montant total encaissé (€)", eurLabel(totalRevenue)]),
    "",
    "SYNTHÈSE — UNE LIGNE PAR RÉSERVATION PAYÉE (ordre chronologique de commande)",
    formatCsvRow(synthHeaders),
    ...synthRows,
    "",
    "LISTE DÉTAILLÉE — CONVIVES (ordre : date de réservation, puis rang / table / siège)",
    formatCsvRow(guestHeaders),
    ...guestRows.map(formatCsvRow),
    ...recapRows.map(recapLine),
    "",
    "LIGNES OPTIONS & UPSELLS (facturation brute, une ligne par ligne de commande)",
    formatCsvRow(upsellDetailHeaders),
    ...upsellDetailRows,
    "",
    "AGRÉGAT OPTIONS & UPSELLS (totaux par type + variante, réservations payées)",
    formatCsvRow(upsellAggHeaders),
    ...upsellAggRows,
  ];

  if (unpaidReservations.length > 0) {
    csvLines.push(
      "",
      "RÉSERVATIONS NON PAYÉES (référence — non incluses dans le détail traiteur ci‑dessus)",
      formatCsvRow([
        "Id rés.",
        "Statut paiement",
        "Créée le",
        "Élève référent",
        "Email",
        "Tél.",
        "Montant (€)",
        "Id session Stripe Checkout",
      ]),
      ...unpaidReservations
        .sort((a, b) => b.id - a.id)
        .map((r) =>
          formatCsvRow([
            String(r.id),
            STRIPE_STATUS_FR[r.stripeStatus] ?? r.stripeStatus,
            formatDateFr(r.createdAt),
            r.referentStudent,
            r.email,
            r.phone || "",
            eurLabel(r.totalAmount),
            r.stripePaymentId || "",
          ])
        )
    );
  }

  const bom = "\uFEFF";
  const csv = bom + csvLines.join("\n");

  const dateSlug = event.eventDate;
  const nameSlug = event.name.replace(/\s+/g, "-").toLowerCase();

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cmotion-${nameSlug}-${dateSlug}-complet.csv"`,
    },
  });
}
