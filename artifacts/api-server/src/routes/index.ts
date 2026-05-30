import { Router, type IRouter } from "express";
import healthRouter from "./health";
import statsRouter from "./stats";
import studentsRouter from "./students";
import accommodationsRouter from "./accommodations";
import documentsRouter from "./documents";

const router: IRouter = Router();

router.use(healthRouter);
router.use(statsRouter);
router.use(studentsRouter);
router.use(accommodationsRouter);
router.use(documentsRouter);

export default router;
