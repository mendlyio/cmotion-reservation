import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { verifyAdmin } from "@/lib/admin";
import { loadEventOrders } from "@/lib/orders";
import { mealLabel } from "@/lib/pricing";
import { contentDisposition } from "@/lib/content-disposition";
import { neutralizeFormula } from "@/lib/security";

const STATUS_FR: Record<string, string> = {
  pending: "En attente",
  paid: "Payé",
  failed: "Échoué",
  refunded: "Remboursé",
};

function text(value: string): string {
  return neutralizeFormula(value);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId: raw } = await params;
  const eventId = Number.parseInt(raw, 10);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "Événement invalide" }, { status: 400 });
  }
  const orders = await loadEventOrders(eventId);
  if (!orders) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Cmotion";
  const summary = workbook.addWorksheet("Réservations");
  summary.addRow(["Réservation", "Statut", "Référent", "Email", "Téléphone", "Tables", "Convives", "Montant EUR"]);
  for (const reservation of orders.reservations) {
    const tables = [...new Set(reservation.guests.map((guest) => guest.tableNumber))].sort((a, b) => a - b).join(", ");
    const row = summary.addRow([
      reservation.id,
      text(STATUS_FR[reservation.status] ?? reservation.status),
      text(reservation.referent),
      text(reservation.email),
      text(reservation.phone ?? ""),
      text(tables),
      reservation.guests.length,
      reservation.totalAmount / 100,
    ]);
    row.getCell(8).numFmt = "0.00";
  }

  const guests = workbook.addWorksheet("Convives");
  guests.addRow(["Réservation", "Place", "Prénom", "Nom", "Repas", "Dessert"]);
  for (const reservation of orders.reservations) {
    for (const guest of reservation.guests) {
      guests.addRow([
        reservation.id,
        text(guest.place),
        text(guest.firstName),
        text(guest.lastName),
        text(mealLabel(guest.mealChoice)),
        guest.hasDessert ? "Oui" : "Non",
      ]);
    }
  }

  const extras = workbook.addWorksheet("Élèves");
  extras.addRow(["Réservation", "Repas", "Quantité"]);
  for (const reservation of orders.reservations) {
    for (const extra of reservation.extras) {
      extras.addRow([reservation.id, text(mealLabel(extra.mealChoice)), extra.quantity]);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": contentDisposition(`commandes-${orders.event.name}.xlsx`),
      "Cache-Control": "no-store",
    },
  });
}
