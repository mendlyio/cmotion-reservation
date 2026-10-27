import { z } from "zod";

const personName = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine((value) => !/[\u0000-\u001F]/.test(value), "Caractère invalide");

export const bookingSchema = z.object({
  eventId: z.number().int().positive(),
  tableId: z.number().int().positive().optional(),
  seatIds: z.array(z.number().int().positive()).min(1).max(40),
  guests: z
    .array(
      z.object({
        seatId: z.number().int().positive(),
        firstName: personName,
        lastName: personName,
        mealChoice: z.string().trim().min(1).max(40),
        hasDessert: z.boolean(),
      })
    )
    .min(1)
    .max(40),
  upsells: z
    .array(
      z.object({
        type: z.string().trim().min(1).max(40),
        quantity: z.number().int().min(1).max(8),
        mealChoice: z.string().trim().min(1).max(40).optional(),
      })
    )
    .max(16)
    .optional(),
  referentStudent: personName,
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(6).max(30),
}).superRefine((data, ctx) => {
  if (new Set(data.seatIds).size !== data.seatIds.length) {
    ctx.addIssue({ code: "custom", message: "Sièges en double" });
  }
  const guestSeats = data.guests.map((guest) => guest.seatId).sort((a, b) => a - b);
  const wanted = [...data.seatIds].sort((a, b) => a - b);
  if (guestSeats.length !== wanted.length || guestSeats.some((id, index) => id !== wanted[index])) {
    ctx.addIssue({ code: "custom", message: "Les convives ne correspondent pas aux sièges" });
  }
});

export type BookingInput = z.infer<typeof bookingSchema>;
