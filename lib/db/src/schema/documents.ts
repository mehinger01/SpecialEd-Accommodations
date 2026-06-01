import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  displayFilename: text("display_filename"),
  extractedStudentName: text("extracted_student_name"),
  documentType: text("document_type").notNull().default("OTHER"),
  status: text("status").notNull().default("pending"),
  studentId: integer("student_id").references(() => studentsTable.id, { onDelete: "set null" }),
  rawTextPreview: text("raw_text_preview"),
  parseError: text("parse_error"),
  parseWarnings: text("parse_warnings"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  parsedAt: timestamp("parsed_at", { withTimezone: true }),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, uploadedAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
