import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import {
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { uuid } from "drizzle-orm/pg-core";
import { jsonb } from "drizzle-orm/pg-core";
import { integer } from "drizzle-orm/pg-core";
export const db = drizzle(sql);

export const paymentTable = pgTable("payment", {
  id: serial("id").primaryKey(),
  carId: uuid("car-id").notNull(),
  amount: integer("amount").notNull(),
  paymentDate: timestamp("payment-date").defaultNow().notNull(),
  paymentStatus: text("status"),
});

export const outboxTable = pgTable("outbox", {
  id: serial("id").primaryKey(),
  data: jsonb("data").notNull(),
});

export const customerTable = pgTable("customer", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phoneNumber: text("phone-number"),
  address: text("address"),
});
