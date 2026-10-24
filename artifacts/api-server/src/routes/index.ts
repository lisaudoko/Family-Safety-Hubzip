import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import coachRouter from "./coach.js";
import authRouter from "./auth.js";
import familyRouter from "./family.js";
import curriculumRouter from "./curriculum.js";
import devicesRouter from "./devices.js";
import billingRouter from "./billing.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(coachRouter);
router.use(authRouter);
router.use(familyRouter);
router.use(curriculumRouter);
router.use(devicesRouter);
router.use(billingRouter);

export default router;
