import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.ts";
import { requiredRole } from "../../middlewares/role.ts";
import * as ctrl from "./agents.controller.ts";

const router = Router();
const canRun = requiredRole("Super Admin", "HR Admin", "Recruiter", "Hiring Manager");

router.post("/:name/run", authenticate, canRun, ctrl.run);

export default router;
