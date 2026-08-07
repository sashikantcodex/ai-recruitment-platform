import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.ts";
import { requiredRole } from "../../middlewares/role.ts";
import * as ctrl from "./candidates.controller.ts";

const router = Router();
const canManage = requiredRole(
  "Super Admin",
  "HR Admin",
  "Recruiter",
  "Hiring Manager",
);

router.get("/", authenticate, canManage, ctrl.listCandidates);
router.get("/:id", authenticate, canManage, ctrl.getCandidate);
router.put("/:id", authenticate, canManage, ctrl.updateCandidate);

export default router;
