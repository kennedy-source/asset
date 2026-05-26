// @ts-nocheck
import { Router } from "express";
import { db, embroideryJobsTable, printingJobsTable, jobStatusHistoryTable, customersTable, usersTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";

const router = Router();

async function getNextJobNumber(prefix: string, table: typeof embroideryJobsTable | typeof printingJobsTable): Promise<string> {
  const [last] = await db.select({ jobNumber: table.jobNumber }).from(table as any).orderBy(desc((table as any).id)).limit(1);
  if (!last) return `${prefix}-0001`;
  const num = parseInt(last.jobNumber.split("-")[1] || "0") + 1;
  return `${prefix}-${num.toString().padStart(4, "0")}`;
}

function toEmbJob(j: any, customerName?: string, assignedName?: string) {
  return {
    id: j.id, job_number: j.jobNumber, customer_id: j.customerId, customer_name: customerName ?? null,
    school_name: j.schoolName, company_name: j.companyName, contact_person: j.contactPerson,
    contact_phone: j.contactPhone, badge_image_url: j.badgeImageUrl, badge_description: j.badgeDescription,
    garment_type: j.garmentType, garment_color: j.garmentColor, thread_colors: j.threadColors,
    placement: j.placement, width_cm: j.widthCm ? Number(j.widthCm) : null,
    height_cm: j.heightCm ? Number(j.heightCm) : null, quantity: j.quantity,
    unit_price: Number(j.unitPrice), total: Number(j.total),
    deposit_paid: Number(j.depositPaid ?? 0), balance: Number(j.balance ?? 0),
    status: j.status, priority: j.priority,
    due_date: j.dueDate?.toISOString() ?? null,
    completed_at: j.completedAt?.toISOString() ?? null,
    notes: j.notes, assigned_to: j.assignedTo, assigned_name: assignedName ?? null,
    created_at: j.createdAt, updated_at: j.updatedAt,
  };
}

function toPrintJob(j: any, customerName?: string, assignedName?: string) {
  return {
    id: j.id, job_number: j.jobNumber, customer_id: j.customerId, customer_name: customerName ?? null,
    design_description: j.designDescription, design_url: j.designUrl,
    print_type: j.printType, garment_type: j.garmentType, garment_color: j.garmentColor,
    print_color: j.printColor, print_size: j.printSize, placement: j.placement,
    quantity: j.quantity, unit_price: Number(j.unitPrice), total: Number(j.total),
    deposit_paid: Number(j.depositPaid ?? 0), balance: Number(j.balance ?? 0),
    status: j.status, priority: j.priority,
    due_date: j.dueDate?.toISOString() ?? null,
    completed_at: j.completedAt?.toISOString() ?? null,
    notes: j.notes, assigned_to: j.assignedTo, assigned_name: assignedName ?? null,
    created_at: j.createdAt, updated_at: j.updatedAt,
  };
}

// Embroidery Jobs
router.get("/embroidery-jobs", async (req, res) => {
  try {
    const { status, customer_id, assigned_to } = req.query as Record<string, string>;
    const conditions = [];
    if (status) conditions.push(eq(embroideryJobsTable.status, status as any));
    if (customer_id) conditions.push(eq(embroideryJobsTable.customerId, parseInt(customer_id)));
    if (assigned_to) conditions.push(eq(embroideryJobsTable.assignedTo, parseInt(assigned_to)));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [jobs, customers, users] = await Promise.all([
      db.select().from(embroideryJobsTable).where(where).orderBy(desc(embroideryJobsTable.createdAt)),
      db.select({ id: customersTable.id, name: customersTable.name }).from(customersTable),
      db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable),
    ]);
    const custMap = new Map(customers.map(c => [c.id, c.name]));
    const userMap = new Map(users.map(u => [u.id, u.name]));

    return res.json(jobs.map(j => toEmbJob(j,
      j.customerId ? custMap.get(j.customerId) : undefined,
      j.assignedTo ? userMap.get(j.assignedTo) : undefined,
    )));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to list embroidery jobs" });
  }
});

router.post("/embroidery-jobs", async (req, res) => {
  try {
    const body = req.body;
    const jobNumber = await getNextJobNumber("EMB", embroideryJobsTable);
    const total = body.total ?? body.unit_price * body.quantity;
    const balance = total - (body.deposit_paid ?? 0);

    const [job] = await db.insert(embroideryJobsTable).values({
      jobNumber, customerId: body.customer_id, schoolName: body.school_name,
      companyName: body.company_name, contactPerson: body.contact_person,
      contactPhone: body.contact_phone, badgeDescription: body.badge_description,
      garmentType: body.garment_type, garmentColor: body.garment_color,
      threadColors: body.thread_colors, placement: body.placement,
      widthCm: body.width_cm?.toString(), heightCm: body.height_cm?.toString(),
      quantity: body.quantity, unitPrice: body.unit_price.toString(),
      total: total.toString(), depositPaid: (body.deposit_paid ?? 0).toString(),
      balance: balance.toString(), status: "pending",
      priority: body.priority ?? "normal",
      dueDate: body.due_date ? new Date(body.due_date) : undefined,
      notes: body.notes, assignedTo: body.assigned_to,
    }).returning();

    return res.status(201).json(toEmbJob(job));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create embroidery job" });
  }
});

router.get("/embroidery-jobs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [job] = await db.select().from(embroideryJobsTable).where(eq(embroideryJobsTable.id, id)).limit(1);
    if (!job) return res.status(404).json({ error: "Job not found" });
    let customerName: string | undefined, assignedName: string | undefined;
    if (job.customerId) {
      const [c] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, job.customerId)).limit(1);
      customerName = c?.name;
    }
    if (job.assignedTo) {
      const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, job.assignedTo)).limit(1);
      assignedName = u?.name;
    }
    return res.json(toEmbJob(job, customerName, assignedName));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get job" });
  }
});

router.patch("/embroidery-jobs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const updates: Record<string, unknown> = {};
    if (body.badge_description !== undefined) updates.badgeDescription = body.badge_description;
    if (body.garment_type !== undefined) updates.garmentType = body.garment_type;
    if (body.thread_colors !== undefined) updates.threadColors = body.thread_colors;
    if (body.quantity !== undefined) updates.quantity = body.quantity;
    if (body.unit_price !== undefined) updates.unitPrice = body.unit_price.toString();
    if (body.total !== undefined) updates.total = body.total.toString();
    if (body.deposit_paid !== undefined) { updates.depositPaid = body.deposit_paid.toString(); updates.balance = (body.total - body.deposit_paid).toString(); }
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.due_date !== undefined) updates.dueDate = body.due_date ? new Date(body.due_date) : null;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.assigned_to !== undefined) updates.assignedTo = body.assigned_to;
    const [job] = await db.update(embroideryJobsTable).set(updates).where(eq(embroideryJobsTable.id, id)).returning();
    if (!job) return res.status(404).json({ error: "Job not found" });
    return res.json(toEmbJob(job));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update job" });
  }
});

router.patch("/embroidery-jobs/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes } = req.body as { status: string; notes?: string };
    const [existing] = await db.select().from(embroideryJobsTable).where(eq(embroideryJobsTable.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Job not found" });

    const updates: Record<string, unknown> = { status };
    if (status === "delivered") updates.completedAt = new Date();

    const [job] = await db.update(embroideryJobsTable).set(updates).where(eq(embroideryJobsTable.id, id)).returning();
    await db.insert(jobStatusHistoryTable).values({
      jobType: "embroidery", jobId: id, oldStatus: existing.status, newStatus: status, notes,
    });
    return res.json(toEmbJob(job!));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update job status" });
  }
});

// Printing Jobs
router.get("/printing-jobs", async (req, res) => {
  try {
    const { status, customer_id } = req.query as Record<string, string>;
    const conditions = [];
    if (status) conditions.push(eq(printingJobsTable.status, status as any));
    if (customer_id) conditions.push(eq(printingJobsTable.customerId, parseInt(customer_id)));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [jobs, customers, users] = await Promise.all([
      db.select().from(printingJobsTable).where(where).orderBy(desc(printingJobsTable.createdAt)),
      db.select({ id: customersTable.id, name: customersTable.name }).from(customersTable),
      db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable),
    ]);
    const custMap = new Map(customers.map(c => [c.id, c.name]));
    const userMap = new Map(users.map(u => [u.id, u.name]));

    return res.json(jobs.map(j => toPrintJob(j,
      j.customerId ? custMap.get(j.customerId) : undefined,
      j.assignedTo ? userMap.get(j.assignedTo) : undefined,
    )));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to list printing jobs" });
  }
});

router.post("/printing-jobs", async (req, res) => {
  try {
    const body = req.body;
    const jobNumber = await getNextJobNumber("PRT", printingJobsTable);
    const total = body.total ?? body.unit_price * body.quantity;
    const balance = total - (body.deposit_paid ?? 0);

    const [job] = await db.insert(printingJobsTable).values({
      jobNumber, customerId: body.customer_id, designDescription: body.design_description,
      printType: body.print_type, garmentType: body.garment_type,
      garmentColor: body.garment_color, printColor: body.print_color,
      printSize: body.print_size, placement: body.placement,
      quantity: body.quantity, unitPrice: body.unit_price.toString(),
      total: total.toString(), depositPaid: (body.deposit_paid ?? 0).toString(),
      balance: balance.toString(), status: "pending",
      priority: body.priority ?? "normal",
      dueDate: body.due_date ? new Date(body.due_date) : undefined,
      notes: body.notes, assignedTo: body.assigned_to,
    }).returning();

    return res.status(201).json(toPrintJob(job));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create printing job" });
  }
});

router.get("/printing-jobs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [job] = await db.select().from(printingJobsTable).where(eq(printingJobsTable.id, id)).limit(1);
    if (!job) return res.status(404).json({ error: "Job not found" });
    return res.json(toPrintJob(job));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get job" });
  }
});

router.patch("/printing-jobs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const updates: Record<string, unknown> = {};
    if (body.design_description !== undefined) updates.designDescription = body.design_description;
    if (body.print_type !== undefined) updates.printType = body.print_type;
    if (body.quantity !== undefined) updates.quantity = body.quantity;
    if (body.unit_price !== undefined) updates.unitPrice = body.unit_price.toString();
    if (body.total !== undefined) updates.total = body.total.toString();
    if (body.deposit_paid !== undefined) { updates.depositPaid = body.deposit_paid.toString(); updates.balance = (body.total - body.deposit_paid).toString(); }
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.due_date !== undefined) updates.dueDate = body.due_date ? new Date(body.due_date) : null;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.assigned_to !== undefined) updates.assignedTo = body.assigned_to;
    const [job] = await db.update(printingJobsTable).set(updates).where(eq(printingJobsTable.id, id)).returning();
    if (!job) return res.status(404).json({ error: "Job not found" });
    return res.json(toPrintJob(job!));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update job" });
  }
});

router.patch("/printing-jobs/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes } = req.body as { status: string; notes?: string };
    const [existing] = await db.select().from(printingJobsTable).where(eq(printingJobsTable.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Job not found" });

    const updates: Record<string, unknown> = { status };
    if (status === "delivered") updates.completedAt = new Date();

    const [job] = await db.update(printingJobsTable).set(updates).where(eq(printingJobsTable.id, id)).returning();
    await db.insert(jobStatusHistoryTable).values({
      jobType: "printing", jobId: id, oldStatus: existing.status, newStatus: status, notes,
    });
    return res.json(toPrintJob(job!));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;
