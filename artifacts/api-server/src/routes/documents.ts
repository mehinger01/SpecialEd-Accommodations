import { Router } from "express";
import multer from "multer";
import { db, documentsTable, accommodationsTable, studentsTable, activityLogTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { parsePdf } from "../lib/pdf-parser";

function normalizeStudentName(name: string): string {
  return name.toLowerCase().replace(/\./g, "").replace(/,/g, "").replace(/\s+/g, " ").trim();
}

function studentNamesMatch(a: string, b: string): boolean {
  const na = normalizeStudentName(a);
  const nb = normalizeStudentName(b);
  if (na === nb) return true;
  // Token-set match: handles "Last, First" vs "First Last"
  return na.split(" ").sort().join(" ") === nb.split(" ").sort().join(" ");
}

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted"));
    }
  },
});

async function getAccommodationCount(documentId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(accommodationsTable)
    .where(eq(accommodationsTable.documentId, documentId));
  return Number(row?.count ?? 0);
}

async function getStudentName(studentId: number | null): Promise<string | null> {
  if (!studentId) return null;
  const [student] = await db
    .select({ displayName: studentsTable.displayName })
    .from(studentsTable)
    .where(eq(studentsTable.id, studentId));
  return student?.displayName ?? null;
}

router.get("/documents", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;

    const rows = status
      ? await db
          .select()
          .from(documentsTable)
          .where(eq(documentsTable.status, status))
          .orderBy(desc(documentsTable.uploadedAt))
      : await db
          .select()
          .from(documentsTable)
          .orderBy(desc(documentsTable.uploadedAt));

    const result = await Promise.all(
      rows.map(async (doc) => ({
        id: doc.id,
        filename: doc.filename,
        displayFilename: doc.displayFilename ?? null,
        extractedStudentName: doc.extractedStudentName ?? null,
        studentMatchResult: doc.studentMatchResult ?? null,
        documentType: doc.documentType,
        status: doc.status,
        studentId: doc.studentId ?? null,
        studentName: await getStudentName(doc.studentId ?? null),
        accommodationCount: await getAccommodationCount(doc.id),
        uploadedAt: doc.uploadedAt,
        parsedAt: doc.parsedAt ?? null,
        parseError: doc.parseError ?? null,
      }))
    );

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list documents");
    res.status(500).json({ error: "Failed to list documents" });
  }
});

router.post("/documents", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file provided" });
    }

    const documentType = (req.body.documentType as string) || "OTHER";
    const studentIdRaw = req.body.studentId;
    const studentId = studentIdRaw ? parseInt(studentIdRaw, 10) : null;

    const [doc] = await db
      .insert(documentsTable)
      .values({
        filename: req.file.originalname,
        documentType,
        status: "pending",
        studentId: studentId || null,
      })
      .returning();

    const studentName = await getStudentName(doc.studentId ?? null);

    await db.insert(activityLogTable).values({
      type: "upload",
      documentId: doc.id,
      documentName: doc.filename,
      studentName,
      message: `Uploaded ${doc.documentType} document: ${doc.filename}`,
    });

    setImmediate(async () => {
      try {
        const result = await parsePdf(req.file!.buffer, doc.documentType);

        const preview = result.rawText.slice(0, 5000);
        const warnings = result.warnings.length > 0 ? JSON.stringify(result.warnings) : null;

        // Auto-match or create a student from the extracted name.
        // Only runs when no student was pre-assigned at upload time.
        let resolvedStudentId: number | null = doc.studentId ?? null;
        let studentMatchResult: string | null = null;
        let resolvedStudentName: string | null = studentName;

        if (result.extractedStudentName && !doc.studentId) {
          const allStudents = await db
            .select({ id: studentsTable.id, displayName: studentsTable.displayName })
            .from(studentsTable);

          const matched = allStudents.find((s) =>
            studentNamesMatch(s.displayName, result.extractedStudentName!)
          );

          if (matched) {
            resolvedStudentId = matched.id;
            studentMatchResult = "matched";
            resolvedStudentName = matched.displayName;
          } else {
            try {
              const [created] = await db
                .insert(studentsTable)
                .values({
                  displayName: result.extractedStudentName,
                  gradeLevel: "Unknown",
                  caseManager: "Unassigned",
                  planType: doc.documentType !== "OTHER" ? doc.documentType : "NONE",
                })
                .returning();
              resolvedStudentId = created.id;
              studentMatchResult = "created";
              resolvedStudentName = created.displayName;
            } catch (createErr) {
              req.log.error({ createErr }, "Failed to auto-create student from extracted name");
              studentMatchResult = "failed";
            }
          }
        }

        await db
          .update(documentsTable)
          .set({
            status: "parsed",
            parsedAt: new Date(),
            rawTextPreview: preview,
            parseWarnings: warnings,
            displayFilename: result.displayFilename,
            extractedStudentName: result.extractedStudentName,
            studentId: resolvedStudentId,
            studentMatchResult,
          })
          .where(eq(documentsTable.id, doc.id));

        if (result.accommodations.length > 0) {
          await db.insert(accommodationsTable).values(
            result.accommodations.map((a) => ({
              studentId: resolvedStudentId,
              documentId: doc.id,
              accommodationName: a.accommodationName,
              category: a.category,
              description: a.description,
              sourceSection: a.sourceSection,
              startDate: a.startDate ?? null,
              endDate: a.endDate ?? null,
              location: a.location ?? null,
              rawText: a.rawText,
            }))
          );
        }

        await db.insert(activityLogTable).values({
          type: "parsed",
          documentId: doc.id,
          documentName: result.displayFilename ?? doc.filename,
          studentName: resolvedStudentName,
          message: `Parsed ${doc.documentType}: found ${result.accommodations.length} accommodation${result.accommodations.length !== 1 ? "s" : ""} across ${result.pageCount} page${result.pageCount !== 1 ? "s" : ""}`,
        });
      } catch (parseErr: any) {
        await db
          .update(documentsTable)
          .set({ status: "error", parseError: String(parseErr?.message ?? parseErr) })
          .where(eq(documentsTable.id, doc.id));

        await db.insert(activityLogTable).values({
          type: "error",
          documentId: doc.id,
          documentName: doc.filename,
          studentName,
          message: `Parse failed for ${doc.filename}: ${String(parseErr?.message ?? parseErr)}`,
        });
      }
    });

    res.status(201).json({
      id: doc.id,
      filename: doc.filename,
      displayFilename: null,
      extractedStudentName: null,
      studentMatchResult: null,
      documentType: doc.documentType,
      status: doc.status,
      studentId: doc.studentId ?? null,
      studentName,
      accommodationCount: 0,
      uploadedAt: doc.uploadedAt,
      parsedAt: null,
      parseError: null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to upload document");
    res.status(500).json({ error: "Failed to upload document" });
  }
});

router.get("/documents/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [doc] = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, id));

    if (!doc) return res.status(404).json({ error: "Document not found" });

    const accommodations = await db
      .select()
      .from(accommodationsTable)
      .where(eq(accommodationsTable.documentId, id));

    const studentName = await getStudentName(doc.studentId ?? null);

    res.json({
      id: doc.id,
      filename: doc.filename,
      displayFilename: doc.displayFilename ?? null,
      extractedStudentName: doc.extractedStudentName ?? null,
      studentMatchResult: doc.studentMatchResult ?? null,
      documentType: doc.documentType,
      status: doc.status,
      studentId: doc.studentId ?? null,
      studentName,
      accommodationCount: accommodations.length,
      uploadedAt: doc.uploadedAt,
      parsedAt: doc.parsedAt ?? null,
      parseError: doc.parseError ?? null,
      rawTextPreview: doc.rawTextPreview ?? null,
      parseWarnings: doc.parseWarnings ? (JSON.parse(doc.parseWarnings) as string[]) : [],
      accommodations: accommodations.map((a) => ({
        ...a,
        accommodationName: a.accommodationName ?? null,
        sourceSection: a.sourceSection ?? null,
        startDate: a.startDate ?? null,
        endDate: a.endDate ?? null,
        location: a.location ?? null,
        isApproved: a.isApproved ?? null,
        notes: a.notes ?? null,
        rawText: a.rawText ?? null,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get document");
    res.status(500).json({ error: "Failed to get document" });
  }
});

router.delete("/documents/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [deleted] = await db
      .delete(documentsTable)
      .where(eq(documentsTable.id, id))
      .returning();

    if (!deleted) return res.status(404).json({ error: "Document not found" });

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete document");
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
