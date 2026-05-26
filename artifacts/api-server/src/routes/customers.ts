import { Router } from "express";
import { db, customersTable, isSqlite } from "@workspace/db";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { eq, like, ilike, sql } from "drizzle-orm";
import { CreateCustomerBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { parsePaginationQuery, resolvePagination } from "../lib/pagination";

const router = Router();

const pgDb: any = db;
router.use(requireAuth);

function normalizeCustomerBody(body: any) {
  return {
    name: body?.name,
    email: body?.email ?? null,
    phone: body?.phone ?? "",
    address: body?.address ?? null,
    customer_type: body?.customer_type ?? body?.customerType ?? "individual",
    notes: body?.notes ?? null,
    schoolName: body?.schoolName ?? body?.school_name ?? null,
  };
}

router.get("/", async (req, res): Promise<void> => {
  try {
    const { page, limit } = parsePaginationQuery(
      req.query as Record<string, unknown>,
    );

    const search = typeof req.query.search === "string" ? req.query.search : "";

    const pg = resolvePagination({ page, limit });

    const searchTerm = search.trim().length > 0 ? `%${search.trim()}%` : null;

    let totalQuery = pgDb
      .select({
        total: sql<number>`COUNT(*)`,
      })
      .from(customersTable);

    let rowsQuery = pgDb.select().from(customersTable);

    if (searchTerm) {
      const searchCondition = isSqlite
        ? like(customersTable.name, searchTerm)
        : ilike(customersTable.name, searchTerm);

      totalQuery = totalQuery.where(searchCondition);
      rowsQuery = rowsQuery.where(searchCondition);
    }

    const [{ total }] = await totalQuery;

    const rows = await rowsQuery
      .orderBy(customersTable.name)
      .limit(pg.limit)
      .offset(pg.offset);

    res.json({
      items: rows,
      page: pg.page,
      limit: pg.limit,
      total: Number(total),
    });
  } catch (error) {
    console.error("Customers list error:", error);

    res.status(500).json({
      error: "Failed to fetch customers",
    });
  }
});

router.post("/", async (req, res): Promise<void> => {
  try {
    const body = normalizeCustomerBody(req.body);
    const parsed = CreateCustomerBody.safeParse(body);

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.flatten(),
      });

      return;
    }

    const inserted = await pgDb
      .insert(customersTable)
      .values({
        ...parsed.data,
        schoolName: body.schoolName,
      })
      .returning();

    res.status(201).json(inserted[0]);
  } catch (error) {
    console.error("Create customer error:", error);

    res.status(500).json({
      error: "Failed to create customer",
    });
  }
});

router.get("/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        error: "Invalid customer id",
      });

      return;
    }

    const rows = await pgDb
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, id))
      .limit(1);

    if (!rows[0]) {
      res.status(404).json({
        error: "Customer not found",
      });

      return;
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Get customer error:", error);

    res.status(500).json({
      error: "Failed to fetch customer",
    });
  }
});

router.patch("/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        error: "Invalid customer id",
      });

      return;
    }

    const body = normalizeCustomerBody(req.body);
    const parsed = CreateCustomerBody.partial().safeParse(body);

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.flatten(),
      });

      return;
    }

    const updated = await pgDb
      .update(customersTable)
      .set({
        ...parsed.data,
        schoolName: body.schoolName,
      })
      .where(eq(customersTable.id, id))
      .returning();

    if (!updated[0]) {
      res.status(404).json({
        error: "Customer not found",
      });

      return;
    }

    res.json(updated[0]);
  } catch (error) {
    console.error("Update customer error:", error);

    res.status(500).json({
      error: "Failed to update customer",
    });
  }
});

router.delete("/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        error: "Invalid customer id",
      });

      return;
    }

    await pgDb.delete(customersTable).where(eq(customersTable.id, id));

    res.json({
      success: true,
    });
  } catch (error) {
    console.error("Delete customer error:", error);

    res.status(500).json({
      error: "Failed to delete customer",
    });
  }
});

export default router;
