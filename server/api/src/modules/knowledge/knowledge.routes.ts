import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.ts";
import { requiredRole } from "../../middlewares/role.ts";
import * as ctrl from "./knowledge.controller.ts";

const router = Router();
const canManage = requiredRole("Super Admin", "HR Admin", "Recruiter");

router.post("/ingest", authenticate, canManage, ctrl.ingest);
router.post("/query", authenticate, canManage, ctrl.query);

export default router;
