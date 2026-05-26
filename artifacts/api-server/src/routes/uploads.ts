import { Router } from "express";
import fs from "fs";
import path from "path";
import { env } from "../config/env";
import { requireAuth, hasRole } from "../middlewares/auth";
import { roles } from "../lib/rbac";
import { AppError } from "../lib/errors";

const router = Router();
router.use(requireAuth);

router.post("/embroidery-badge", async (req, res): Promise<void> => {
  if (!hasRole(req.user?.role, ...roles.operations))
    throw new AppError(403, "FORBIDDEN", "Forbidden");

  const filename = String(req.body?.filename || "").trim();
  const data = String(req.body?.data || "").trim();
  if (!filename || !data) {
    res.status(400).json({ error: "filename and base64 data required" });
    return;
  }

  const uploadsDir = path.resolve(process.cwd(), "uploads", "embroidery");
  fs.mkdirSync(uploadsDir, { recursive: true });

  // sanitize filename
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dest = path.join(uploadsDir, `${Date.now()}-${safeName}`);
  const buffer = Buffer.from(data.replace(/^data:.*;base64,/, ""), "base64");
  fs.writeFileSync(dest, buffer);

  const publicPath = `/uploads/embroidery/${path.basename(dest)}`;
  res.status(201).json({ path: publicPath });
});

export default router;
