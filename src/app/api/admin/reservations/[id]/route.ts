import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  reservations,
  reservationSeats,
  events,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/admin";
import { resend } from "@/lib/resend";
import { renderUpdateEmail } from "@/emails/ReservationUpdateEmail";
import { MEAL_OPTIONS } from "@/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idStr } = await params;
  const reservationId = parseInt(idStr);

  const body = await request.json();
  const { adminNotes, guests, sendEmail } = body;

  // Update reservation notes
  if (adminNotes !== undefined) {
    await db
      .update(reservations)
      .set({ adminNotes })
      .where(eq(reservations.id, reservationId));
  }

  // Track changes for email
  const changes: string[] = [];

  // Update guests
  if (guests && Array.isArray(guests)) {
    for (const guest of guests) {
      const [existing] = await db
        .select()
        .from(reservationSeats)
        .where(eq(reservationSeats.id, guest.id));

      if (!existing) continue;
      if (existing.reservationId !== reservationId) continue;

      const updates: Record<string, unknown> = {};

      if (guest.firstName !== existing.firstName) {
        updates.firstName = guest.firstName;
      }
      if (guest.lastName !== existing.lastName) {
        updates.lastName = guest.lastName;
      }
      if (guest.mealChoice !== existing.mealChoice) {
        const oldMeal =
          MEAL_OPTIONS.find((m) => m.value === existing.mealChoice)?.label ||
          existing.mealChoice;
        const newMeal =
          MEAL_OPTIONS.find((m) => m.value === guest.mealChoice)?.label ||
          guest.mealChoice;
        changes.push(
          `Repas de ${existing.firstName} ${existing.lastName} changé : ${oldMeal} → ${newMeal}`
        );
        updates.mealChoice = guest.mealChoice;
      }
      if (guest.hasDessert !== existing.hasDessert) {
        changes.push(
          `Dessert de ${existing.firstName} ${existing.lastName} : ${guest.hasDessert ? "ajouté" : "retiré"}`
        );
        updates.hasDessert = guest.hasDessert;
      }
      if (guest.adminNotes !== undefined) {
        updates.adminNotes = guest.adminNotes;
      }

      if (Object.keys(updates).length > 0) {
        await db
          .update(reservationSeats)
          .set(updates)
          .where(eq(reservationSeats.id, guest.id));
      }
    }
  }

  if (adminNotes !== undefined) {
    changes.push("Notes admin mises à jour");
  }

  // Send email notification if requested and there are changes
  if (sendEmail && changes.length > 0) {
    try {
      const [reservation] = await db
        .select()
        .from(reservations)
        .where(eq(reservations.id, reservationId));

      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, reservation.eventId));

      const updatedGuests = await db
        .select()
        .from(reservationSeats)
        .where(eq(reservationSeats.reservationId, reservationId));

      const html = renderUpdateEmail({
        reservationId: reservation.id,
        eventName: event.name,
        eventDate: event.eventDate,
        timeInfo: event.timeInfo,
        changes,
        guests: updatedGuests.map((g) => ({
          firstName: g.firstName,
          lastName: g.lastName,
          mealChoice: g.mealChoice,
          hasDessert: g.hasDessert,
        })),
      });

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "noreply@example.com",
        to: reservation.email,
        subject: `Modification de votre réservation #${reservation.id} - Cmotion`,
        html,
      });
    } catch (emailError) {
      console.error("Failed to send update email:", emailError);
    }
  }

  return NextResponse.json({ success: true, changes });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idStr } = await params;
  const reservationId = parseInt(idStr);

  const [reservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, reservationId));

  if (!reservation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const guests = await db
    .select()
    .from(reservationSeats)
    .where(eq(reservationSeats.reservationId, reservationId));

  return NextResponse.json({ reservation, guests });
}
