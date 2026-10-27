import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin";
import { loadEventOrders, paidReservations } from "@/lib/orders";
import { renderRecapPdf } from "@/lib/pdf/documents";

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

  const paid = paidReservations(orders);
  const bytes = await renderRecapPdf({
    timeInfo: orders.event.timeInfo,
    reservations: paid.map((reservation) => ({
      guests: reservation.guests,
      extras: reservation.extras,
    })),
  });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recap-tables-${orders.event.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
