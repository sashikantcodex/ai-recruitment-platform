import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.ts";
import { requiredRole } from "../../middlewares/role.ts";
import * as ctrl from "./assessments.controller.ts";

const router = Router();
const canManage = requiredRole("Super Admin", "HR Admin", "Recruiter", "Hiring Manager");

router.get("/", authenticate, canManage, ctrl.list);
router.post("/", authenticate, canManage, ctrl.create);
router.post("/generate", authenticate, canManage, ctrl.generate);
router.get("/attempts", authenticate, canManage, ctrl.listAttempts);
router.get("/attempts/:attemptId", authenticate, canManage, ctrl.getAttempt);
router.get("/:id", authenticate, canManage, ctrl.get);
router.post("/:id/invite", authenticate, canManage, ctrl.invite);

export default router;
