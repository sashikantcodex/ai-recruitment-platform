import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.ts";
import { requiredRole } from "../../middlewares/role.ts";
import * as ctrl from "./templates.controller.ts";

const router = Router();
const canManage = requiredRole("Super Admin", "HR Admin", "Recruiter", "Hiring Manager");

router.get("/", authenticate, ctrl.listTemplates);
router.get("/:id", authenticate, ctrl.getTemplate);
router.post("/", authenticate, canManage, ctrl.createTemplate);
router.delete("/:id", authenticate, canManage, ctrl.deleteTemplate);

export default router;
