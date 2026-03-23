import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const seatStatusEnum = pgEnum("seat_status", [
  "available",
  "held",
  "reserved",
]);

export const stripeStatusEnum = pgEnum("stripe_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  eventDate: date("event_date").notNull(),
  timeInfo: text("time_info").notNull(),
  ageGroup: text("age_group").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  rowNumber: integer("row_number").notNull(),
  tableNumber: integer("table_number").notNull(),
  seatCount: integer("seat_count").notNull().default(8),
  isVip: boolean("is_vip").notNull().default(false),
});

export const seats = pgTable("seats", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id")
    .notNull()
    .references(() => tables.id, { onDelete: "cascade" }),
  seatNumber: integer("seat_number").notNull(),
  status: seatStatusEnum("status").notNull().default("available"),
});

export const holds = pgTable("holds", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  tableId: integer("table_id").references(() => tables.id, {
    onDelete: "cascade",
  }),
  seatId: integer("seat_id").references(() => seats.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  referentStudent: text("referent_student").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  totalAmount: integer("total_amount").notNull(),
  stripePaymentId: text("stripe_payment_id"),
  stripeStatus: stripeStatusEnum("stripe_status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reservationSeats = pgTable("reservation_seats", {
  id: serial("id").primaryKey(),
  reservationId: integer("reservation_id")
    .notNull()
    .references(() => reservations.id, { onDelete: "cascade" }),
  seatId: integer("seat_id")
    .notNull()
    .references(() => seats.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  mealChoice: text("meal_choice").notNull(),
  hasDessert: boolean("has_dessert").notNull().default(false),
  adminNotes: text("admin_notes"),
});

export const reservationUpsells = pgTable("reservation_upsells", {
  id: serial("id").primaryKey(),
  reservationId: integer("reservation_id")
    .notNull()
    .references(() => reservations.id, { onDelete: "cascade" }),
  upsellType: text("upsell_type").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
});

// Relations
export const eventsRelations = relations(events, ({ many }) => ({
  tables: many(tables),
  reservations: many(reservations),
  holds: many(holds),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  event: one(events, { fields: [tables.eventId], references: [events.id] }),
  seats: many(seats),
  holds: many(holds),
}));

export const seatsRelations = relations(seats, ({ one, many }) => ({
  table: one(tables, { fields: [seats.tableId], references: [tables.id] }),
  holds: many(holds),
  reservationSeats: many(reservationSeats),
}));

export const holdsRelations = relations(holds, ({ one }) => ({
  event: one(events, { fields: [holds.eventId], references: [events.id] }),
  table: one(tables, { fields: [holds.tableId], references: [tables.id] }),
  seat: one(seats, { fields: [holds.seatId], references: [seats.id] }),
}));

export const reservationsRelations = relations(
  reservations,
  ({ one, many }) => ({
    event: one(events, {
      fields: [reservations.eventId],
      references: [events.id],
    }),
    seats: many(reservationSeats),
    upsells: many(reservationUpsells),
  })
);

export const reservationSeatsRelations = relations(
  reservationSeats,
  ({ one }) => ({
    reservation: one(reservations, {
      fields: [reservationSeats.reservationId],
      references: [reservations.id],
    }),
    seat: one(seats, {
      fields: [reservationSeats.seatId],
      references: [seats.id],
    }),
  })
);

export const reservationUpsellsRelations = relations(
  reservationUpsells,
  ({ one }) => ({
    reservation: one(reservations, {
      fields: [reservationUpsells.reservationId],
      references: [reservations.id],
    }),
  })
);
