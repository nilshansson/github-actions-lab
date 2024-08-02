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
export const db = drizzle(sql);

export const orderTable = pgTable("order", {
  id: serial("id").primaryKey(),
  carId: uuid("car-id").notNull(),
  orderDate: timestamp("order-date").defaultNow().notNull(),
  orderStatus: text("status"),
});

export const outboxTable = pgTable("outbox", {
  id: serial("id").primaryKey(),
  data: jsonb("data").notNull(),
});
