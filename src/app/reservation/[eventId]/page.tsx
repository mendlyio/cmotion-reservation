import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReservationClient } from "./ReservationClient";
import { guardEvent } from "@/lib/event-guard";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ eventId: string }>;
}

export default async function ReservationPage({ params }: Props) {
  const { eventId: eventIdStr } = await params;
  const eventId = parseInt(eventIdStr);

  if (isNaN(eventId)) notFound();

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId));

  if (!event || !(await guardEvent(event))) notFound();

  return (
    <Suspense>
      <ReservationClient event={event} />
    </Suspense>
  );
}
