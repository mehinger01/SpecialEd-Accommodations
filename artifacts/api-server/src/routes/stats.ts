import { Router } from "express";
import { db, studentsTable, documentsTable, accommodationsTable } from "@workspace/db";
import { sql, count } from "drizzle-orm";

const router = Router();

router.get("/stats", async (req, res) => {
  try {
    const [docStats] = await db
      .select({
        totalDocuments: count(),
        parsedDocuments: sql<number>`count(*) filter (where ${documentsTable.status} = 'parsed')`.as("parsed"),
        pendingDocuments: sql<number>`count(*) filter (where ${documentsTable.status} = 'pending')`.as("pending"),
        errorDocuments: sql<number>`count(*) filter (where ${documentsTable.status} = 'error')`.as("error"),
      })
      .from(documentsTable);

    const [studentStats] = await db.select({ totalStudents: count() }).from(studentsTable);
    const [accommodationStats] = await db.select({ totalAccommodations: count() }).from(accommodationsTable);

    res.json({
      totalDocuments: Number(docStats.totalDocuments),
      parsedDocuments: Number(docStats.parsedDocuments),
      pendingDocuments: Number(docStats.pendingDocuments),
      errorDocuments: Number(docStats.errorDocuments),
      totalStudents: Number(studentStats.totalStudents),
      totalAccommodations: Number(accommodationStats.totalAccommodations),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch stats");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/recent-activity", async (req, res) => {
  try {
    const { activityLogTable } = await import("@workspace/db");
    const { desc } = await import("drizzle-orm");
    const items = await db
      .select()
      .from(activityLogTable)
      .orderBy(desc(activityLogTable.occurredAt))
      .limit(20);

    const mapped = items.map((item) => ({
      id: item.id,
      type: item.type,
      documentId: item.documentId,
      documentName: item.documentName,
      studentName: item.studentName,
      message: item.message,
      occurredAt: item.occurredAt,
    }));

    res.json(mapped);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch activity");
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

export default router;
