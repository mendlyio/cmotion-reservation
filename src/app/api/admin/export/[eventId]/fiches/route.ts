import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin";
import { loadEventOrders, paidReservations } from "@/lib/orders";
import { renderFichesPdf } from "@/lib/pdf/documents";

async function guard(eventIdRaw: string) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const eventId = Number.parseInt(eventIdRaw, 10);
  if (!Number.isInteger(eventId)) return { error: NextResponse.json({ error: "Événement invalide" }, { status: 400 }) };
  const orders = await loadEventOrders(eventId);
  if (!orders) return { error: NextResponse.json({ error: "Événement introuvable" }, { status: 404 }) };
  return { orders };
}

function pdfResponse(bytes: Uint8Array, filename: string) {
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const result = await guard(eventId);
  if ("error" in result && result.error) return result.error;
  const orders = result.orders!;
  const paid = paidReservations(orders);
  const bytes = await renderFichesPdf({
    timeInfo: orders.event.timeInfo,
    reservations: paid.map((reservation) => ({
      referent: reservation.referent,
      guests: reservation.guests,
      extras: reservation.extras,
    })),
  });
  return pdfResponse(bytes, `fiches-${orders.event.id}.pdf`);
}
