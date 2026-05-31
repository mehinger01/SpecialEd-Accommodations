import { Router } from "express";
import { db, studentsTable, documentsTable, accommodationsTable } from "@workspace/db";
import { eq, ilike, or, count, sql } from "drizzle-orm";

const router = Router();

router.get("/students", async (req, res) => {
  try {
    const search = req.query.search as string | undefined;

    const base = db
      .select({
        id: studentsTable.id,
        displayName: studentsTable.displayName,
        gradeLevel: studentsTable.gradeLevel,
        caseManager: studentsTable.caseManager,
        planType: studentsTable.planType,
        createdAt: studentsTable.createdAt,
        accommodationCount: sql<number>`(select count(*) from accommodations a where a.student_id = ${studentsTable.id})`.as("accommodation_count"),
        documentCount: sql<number>`(select count(*) from documents d where d.student_id = ${studentsTable.id})`.as("document_count"),
      })
      .from(studentsTable);

    const rows = search
      ? await base.where(
          or(
            ilike(studentsTable.displayName, `%${search}%`),
            ilike(studentsTable.caseManager, `%${search}%`),
            ilike(studentsTable.gradeLevel, `%${search}%`)
          )
        )
      : await base;

    res.json(
      rows.map((r) => ({
        ...r,
        accommodationCount: Number(r.accommodationCount),
        documentCount: Number(r.documentCount),
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
        accommodationCount: sql<number>`(select count(*) from accommodations a where a.student_id = ${studentsTable.id})`.as("accommodation_count"),
        documentCount: sql<number>`(select count(*) from documents d where d.student_id = ${studentsTable.id})`.as("document_count"),
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
      accommodationCount: Number(student.accommodationCount),
      documentCount: Number(student.documentCount),
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

    // Unassign documents (keep them, just detach from student)
    await db
      .update(documentsTable)
      .set({ studentId: null })
      .where(eq(documentsTable.studentId, id));

    const [deleted] = await db
      .delete(studentsTable)
      .where(eq(studentsTable.id, id))
      .returning();

    if (!deleted) return res.status(404).json({ error: "Student not found" });

    req.log.info({ studentId: id }, "Deleted student");
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
