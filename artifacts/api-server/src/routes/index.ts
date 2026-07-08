import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import coachRouter from "./coach.js";
import authRouter from "./auth.js";
import familyRouter from "./family.js";
import curriculumRouter from "./curriculum.js";
import devicesRouter from "./devices.js";
import billingRouter from "./billing.js";
import analyticsRouter from "./analytics.js";
import dashboardRouter from "./dashboard.js";
import notificationsRouter from "./notifications.js";

const router: IRouter = Router();

// authRouter and healthRouter must be mounted before any router that applies
// requireAuth unconditionally at the router level (coach, family, curriculum,
// devices) - Express runs that middleware for every request reaching the
// router regardless of whether one of its own routes matches, so mounting a
// protected router first would 401 public routes like /auth/register/login
// before they're ever reached.
router.use(healthRouter);
router.use(authRouter);
router.use(coachRouter);
router.use(familyRouter);
router.use(curriculumRouter);
router.use(devicesRouter);
router.use(billingRouter);
router.use(analyticsRouter);
router.use(dashboardRouter);
router.use(notificationsRouter);

export default router;
