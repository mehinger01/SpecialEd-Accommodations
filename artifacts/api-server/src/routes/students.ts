import { Router } from "express";
import { db, studentsTable, documentsTable, accommodationsTable, activityLogTable } from "@workspace/db";
import { eq, ilike, or, count, inArray } from "drizzle-orm";

const router = Router();

router.get("/students", async (req, res) => {
  try {
    const search = req.query.search as string | undefined;

    // Correlated subqueries in Drizzle sql`` templates emit parameterised placeholders
    // rather than column references, so they always return the same row's value.
    // Use separate group-by aggregation queries instead and merge in application code.
    const base = db
      .select({
        id: studentsTable.id,
        displayName: studentsTable.displayName,
        gradeLevel: studentsTable.gradeLevel,
        caseManager: studentsTable.caseManager,
        planType: studentsTable.planType,
        createdAt: studentsTable.createdAt,
      })
      .from(studentsTable);

    const [students, accomCounts, docCounts] = await Promise.all([
      search
        ? base.where(or(
            ilike(studentsTable.displayName, `%${search}%`),
            ilike(studentsTable.caseManager, `%${search}%`),
            ilike(studentsTable.gradeLevel, `%${search}%`)
          ))
        : base,
      db.select({ studentId: accommodationsTable.studentId, cnt: count(accommodationsTable.id) })
        .from(accommodationsTable)
        .groupBy(accommodationsTable.studentId),
      db.select({ studentId: documentsTable.studentId, cnt: count(documentsTable.id) })
        .from(documentsTable)
        .groupBy(documentsTable.studentId),
    ]);

    const accomMap = new Map(accomCounts.map(r => [r.studentId, Number(r.cnt)]));
    const docMap   = new Map(docCounts.map(r => [r.studentId, Number(r.cnt)]));

    res.json(
      students.map(s => ({
        ...s,
        accommodationCount: accomMap.get(s.id) ?? 0,
        documentCount:      docMap.get(s.id) ?? 0,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list students");
    res.status(500).json({ error: "Failed to list students" });
  }
});

router.post("/students", async (req, res) => {
  try {
    const { displayName } = req.body as { displayName?: string };
    if (!displayName || !displayName.trim()) {
      return res.status(400).json({ error: "displayName is required" });
    }

    const [student] = await db
      .insert(studentsTable)
      .values({
        displayName: displayName.trim(),
        gradeLevel: "Unknown",
        caseManager: "Unassigned",
        planType: "NONE",
      })
      .returning();

    req.log.info({ studentId: student.id }, "Created student");

    res.status(201).json({
      id: student.id,
      displayName: student.displayName,
      gradeLevel: student.gradeLevel,
      caseManager: student.caseManager,
      planType: student.planType,
      accommodationCount: 0,
      documentCount: 0,
      createdAt: student.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create student");
    res.status(500).json({ error: "Failed to create student" });
  }
});

router.get("/students/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [student] = await db
      .select({
        id: studentsTable.id,
        displayName: studentsTable.displayName,
        gradeLevel: studentsTable.gradeLevel,
        caseManager: studentsTable.caseManager,
        planType: studentsTable.planType,
        createdAt: studentsTable.createdAt,
      })
      .from(studentsTable)
      .where(eq(studentsTable.id, id));

    if (!student) return res.status(404).json({ error: "Student not found" });

    const accommodations = await db
      .select()
      .from(accommodationsTable)
      .where(eq(accommodationsTable.studentId, id));

    const documents = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.studentId, id));

    const studentName = student.displayName;

    res.json({
      ...student,
      accommodationCount: accommodations.length,
      documentCount: documents.length,
      accommodations: accommodations.map((a) => ({
        ...a,
        isApproved: a.isApproved ?? null,
        notes: a.notes ?? null,
        rawText: a.rawText ?? null,
      })),
      documents: documents.map((d) => ({
        ...d,
        studentId: d.studentId ?? null,
        studentName: studentName,
        accommodationCount: 0,
        parsedAt: d.parsedAt ?? null,
        parseError: d.parseError ?? null,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get student");
    res.status(500).json({ error: "Failed to get student" });
  }
});

router.delete("/students/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    // PROTOTYPE BEHAVIOR:
    // Student deletion permanently removes all related data.
    //
    // PRODUCTION BEHAVIOR SHOULD LIKELY USE:
    // Archive / Deactivate Student rather than hard deletion.

    const deleted = await db.transaction(async (tx) => {
      // 1. Collect document IDs so we can clean up activity log entries
      const docs = await tx
        .select({ id: documentsTable.id })
        .from(documentsTable)
        .where(eq(documentsTable.studentId, id));
      const docIds = docs.map((d) => d.id);

      // 2. Delete activity log records tied to those documents
      if (docIds.length > 0) {
        await tx.delete(activityLogTable).where(inArray(activityLogTable.documentId, docIds));
      }

      // 3. Delete all accommodations for this student
      await tx.delete(accommodationsTable).where(eq(accommodationsTable.studentId, id));

      // 4. Delete all documents for this student
      await tx.delete(documentsTable).where(eq(documentsTable.studentId, id));

      // 5. Delete the student record itself
      const [student] = await tx.delete(studentsTable).where(eq(studentsTable.id, id)).returning();
      return student ?? null;
    });

    if (!deleted) return res.status(404).json({ error: "Student not found" });

    req.log.info({ studentId: id }, "Deleted student (cascade)");
    res.json({
      id: deleted.id,
      displayName: deleted.displayName,
      gradeLevel: deleted.gradeLevel,
      caseManager: deleted.caseManager,
      planType: deleted.planType,
      accommodationCount: 0,
      documentCount: 0,
      createdAt: deleted.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to delete student");
    res.status(500).json({ error: "Failed to delete student" });
  }
});

router.get("/students/:id/accommodations", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const accommodations = await db
      .select()
      .from(accommodationsTable)
      .where(eq(accommodationsTable.studentId, id));

    res.json(
      accommodations.map((a) => ({
        ...a,
        isApproved: a.isApproved ?? null,
        notes: a.notes ?? null,
        rawText: a.rawText ?? null,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get student accommodations");
    res.status(500).json({ error: "Failed to get student accommodations" });
  }
});

export default router;
