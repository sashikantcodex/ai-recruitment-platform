import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.ts";
import { requiredRole } from "../../middlewares/role.ts";
import * as ctrl from "./evaluations.controller.ts";

const router = Router();
const canManage = requiredRole("Super Admin", "HR Admin", "Recruiter", "Hiring Manager");

router.get("/", authenticate, canManage, ctrl.list);
router.post("/", authenticate, canManage, ctrl.generate);
router.get("/application/:applicationId", authenticate, canManage, ctrl.getByApplication);
router.post("/application/:applicationId/decision", authenticate, canManage, ctrl.decide);

export default router;
