import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import { roles } from "../lib/rbac";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import customersRouter from "./customers";
import suppliersRouter from "./suppliers";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import stockRouter from "./stock";
import salesRouter from "./sales";
import paystackWebhookRouter from "./paystack-webhook";
import paymentsRouter from "./payments";
import quotationsRouter from "./quotations";
import invoicesRouter from "./invoices";
import embroideryRouter from "./embroidery";
import printingRouter from "./printing";
import productionRouter from "./production";
import expensesRouter from "./expenses";
import aiScansRouter from "./ai-scans";
import aiRouter from "./ai";
import auditLogsRouter from "./audit-logs";
import settingsRouter from "./settings";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import syncRouter from "./sync";
import diagnosticsRouter from "./diagnostics";
import backupRouter from "./backup";
import uploadsRouter from "./uploads";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/payments/webhook", paystackWebhookRouter);
router.use("/paystack/webhook", paystackWebhookRouter);
router.use("/users", requireAuth, requireRole(...roles.adminOnly), usersRouter);
router.use("/customers", customersRouter);
router.use(
  "/suppliers",
  requireAuth,
  requireRole(...roles.management),
  suppliersRouter,
);
router.use(
  "/categories",
  requireAuth,
  requireRole(...roles.management),
  categoriesRouter,
);
router.use(
  "/products",
  requireAuth,
  requireRole(...roles.staff),
  productsRouter,
);
router.use(
  "/stock",
  requireAuth,
  requireRole(...roles.management),
  stockRouter,
);
router.use("/sales", requireAuth, requireRole(...roles.sales), salesRouter);
router.use(
  "/payments",
  requireAuth,
  requireRole(...roles.sales),
  paymentsRouter,
);
router.use(
  "/quotations",
  requireAuth,
  requireRole(...roles.sales),
  quotationsRouter,
);
router.use(
  "/invoices",
  requireAuth,
  requireRole(...roles.sales),
  invoicesRouter,
);
router.use(
  "/embroidery",
  requireAuth,
  requireRole(...roles.operations),
  embroideryRouter,
);
router.use(
  "/embroidery-jobs",
  requireAuth,
  requireRole(...roles.operations),
  embroideryRouter,
);
router.use(
  "/printing",
  requireAuth,
  requireRole(...roles.operations),
  printingRouter,
);
router.use(
  "/printing-jobs",
  requireAuth,
  requireRole(...roles.operations),
  printingRouter,
);
router.use(
  "/production",
  requireAuth,
  requireRole(...roles.operations),
  productionRouter,
);
router.use(
  "/expenses",
  requireAuth,
  requireRole(...roles.management),
  expensesRouter,
);
router.use("/ai-scans", aiScansRouter);
router.use("/ai", aiRouter);
router.use(
  "/audit-logs",
  requireAuth,
  requireRole(...roles.adminOnly),
  auditLogsRouter,
);
router.use(
  "/settings",
  requireAuth,
  requireRole(...roles.management),
  settingsRouter,
);
router.use(
  "/dashboard",
  requireAuth,
  requireRole(...roles.sales),
  dashboardRouter,
);
router.use(
  "/reports",
  requireAuth,
  requireRole(...roles.management),
  reportsRouter,
);
router.use("/sync", syncRouter);
router.use("/diagnostics", diagnosticsRouter);
router.use("/backup", backupRouter);
router.use(
  "/uploads",
  requireAuth,
  requireRole(...roles.operations),
  uploadsRouter,
);

export default router;
