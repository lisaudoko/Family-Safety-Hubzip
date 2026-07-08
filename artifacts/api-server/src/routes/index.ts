import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import coachRouter from "./coach.js";
import authRouter from "./auth.js";
import familyRouter from "./family.js";
import curriculumRouter from "./curriculum.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(coachRouter);
router.use(authRouter);
router.use(familyRouter);
router.use(curriculumRouter);

export default router;
