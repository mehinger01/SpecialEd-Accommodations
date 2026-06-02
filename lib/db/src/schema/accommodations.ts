import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { documentsTable } from "./documents";

export const accommodationsTable = pgTable("accommodations", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => studentsTable.id, { onDelete: "cascade" }),
  documentId: integer("document_id").references(() => documentsTable.id, { onDelete: "cascade" }),
  accommodationName: text("accommodation_name"),
  category: text("category").notNull(),
  description: text("description").notNull(),
  sourceSection: text("source_section"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  location: text("location"),
  rawText: text("raw_text"),
  isReviewed: boolean("is_reviewed").notNull().default(false),
  isApproved: boolean("is_approved"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAccommodationSchema = createInsertSchema(accommodationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAccommodation = z.infer<typeof insertAccommodationSchema>;
export type Accommodation = typeof accommodationsTable.$inferSelect;
