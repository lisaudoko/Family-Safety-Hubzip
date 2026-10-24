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
import adminRouter from "./admin.js";

const router: IRouter = Router();

// authRouter and healthRouter must be mounted before any router that applies
// requireAuth unconditionally at the router level (coach, family, curriculum,
// devices) - Express runs that middleware for every request reaching the
// router regardless of whether one of its own routes matches, so mounting a
// protected router first would 401 public routes like /auth/register/login
// before they're ever reached.
//
// adminRouter must be mounted before dashboardRouter, which blanket-applies
// requireParent at the router level (unlike every other router here,
// including adminRouter itself, which only gate individual routes) -
// requireParent would otherwise 403 any /admin/* request before it ever
// reaches adminRouter, since dashboardRouter's blanket middleware runs on
// every request that passes through it regardless of whether one of its own
// routes matches. If dashboard.ts is ever refactored to gate per-route like
// the rest, this ordering constraint goes away.
router.use(healthRouter);
router.use(authRouter);
router.use(coachRouter);
router.use(familyRouter);
router.use(curriculumRouter);
router.use(devicesRouter);
router.use(billingRouter);
router.use(analyticsRouter);
router.use(adminRouter);
router.use(dashboardRouter);
router.use(notificationsRouter);

export default router;
