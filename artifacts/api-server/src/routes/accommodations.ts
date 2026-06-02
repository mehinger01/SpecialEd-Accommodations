import { Router } from "express";
import { db, accommodationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { UpdateAccommodationBody } from "@workspace/api-zod";

const router = Router();

router.get("/accommodations", async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const studentIdRaw = req.query.studentId as string | undefined;
    const documentIdRaw = req.query.documentId as string | undefined;

    const conditions = [];
    if (category) conditions.push(eq(accommodationsTable.category, category));
    if (studentIdRaw) {
      const studentId = parseInt(studentIdRaw, 10);
      if (!isNaN(studentId)) conditions.push(eq(accommodationsTable.studentId, studentId));
    }
    if (documentIdRaw) {
      const documentId = parseInt(documentIdRaw, 10);
      if (!isNaN(documentId)) conditions.push(eq(accommodationsTable.documentId, documentId));
    }

    const rows =
      conditions.length > 0
        ? await db.select().from(accommodationsTable).where(and(...conditions))
        : await db.select().from(accommodationsTable);

    res.json(
      rows.map((a) => ({
        ...a,
        isApproved: a.isApproved ?? null,
        notes: a.notes ?? null,
        rawText: a.rawText ?? null,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list accommodations");
    res.status(500).json({ error: "Failed to list accommodations" });
  }
});

router.get("/accommodations/by-category", async (req, res) => {
  try {
    const rows = await db
      .select({
        category: accommodationsTable.category,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(accommodationsTable)
      .groupBy(accommodationsTable.category)
      .orderBy(sql`count(*) desc`);

    res.json(rows.map((r) => ({ category: r.category, count: Number(r.count) })));
  } catch (err) {
    req.log.error({ err }, "Failed to get accommodations by category");
    res.status(500).json({ error: "Failed to get accommodations by category" });
  }
});

router.get("/accommodations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [row] = await db
      .select()
      .from(accommodationsTable)
      .where(eq(accommodationsTable.id, id));

    if (!row) return res.status(404).json({ error: "Accommodation not found" });

    res.json({
      ...row,
      isApproved: row.isApproved ?? null,
      notes: row.notes ?? null,
      rawText: row.rawText ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get accommodation");
    res.status(500).json({ error: "Failed to get accommodation" });
  }
});

router.put("/accommodations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const parsed = UpdateAccommodationBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const updates: Partial<typeof accommodationsTable.$inferInsert> = {};
    const data = parsed.data;
    if (data.category !== undefined) updates.category = data.category;
    if (data.description !== undefined) updates.description = data.description;
    if (data.isReviewed !== undefined) updates.isReviewed = data.isReviewed;
    if (data.isApproved !== undefined) updates.isApproved = data.isApproved;
    if (data.notes !== undefined) updates.notes = data.notes;

    const [updated] = await db
      .update(accommodationsTable)
      .set(updates)
      .where(eq(accommodationsTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Accommodation not found" });

    res.json({
      ...updated,
      isApproved: updated.isApproved ?? null,
      notes: updated.notes ?? null,
      rawText: updated.rawText ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update accommodation");
    res.status(500).json({ error: "Failed to update accommodation" });
  }
});

router.delete("/accommodations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [deleted] = await db
      .delete(accommodationsTable)
      .where(eq(accommodationsTable.id, id))
      .returning();

    if (!deleted) return res.status(404).json({ error: "Accommodation not found" });

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete accommodation");
    res.status(500).json({ error: "Failed to delete accommodation" });
  }
});

export default router;
