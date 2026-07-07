import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import coachRouter from "./coach.js";
import authRouter from "./auth.js";
import familyRouter from "./family.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(coachRouter);
router.use(authRouter);
router.use(familyRouter);

export default router;
