import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import customersRouter from "./customers";
import suppliersRouter from "./suppliers";
import salesRouter from "./sales";
import invoicesRouter from "./invoices";
import jobsRouter from "./jobs";
import expensesRouter from "./expenses";
import dashboardRouter from "./dashboard";
import miscRouter from "./misc";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(customersRouter);
router.use(suppliersRouter);
router.use(salesRouter);
router.use(invoicesRouter);
router.use(jobsRouter);
router.use(expensesRouter);
router.use(dashboardRouter);
router.use(miscRouter);

export default router;
