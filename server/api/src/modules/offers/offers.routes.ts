import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.ts";
import { requiredRole } from "../../middlewares/role.ts";
import * as ctrl from "./offers.controller.ts";

const router = Router();
const canManage = requiredRole("Super Admin", "HR Admin", "Recruiter", "Hiring Manager");

router.get("/", authenticate, canManage, ctrl.list);
router.post("/", authenticate, canManage, ctrl.create);
router.get("/:id", authenticate, canManage, ctrl.get);
router.post("/:id/send", authenticate, canManage, ctrl.send);
router.post("/:id/respond", authenticate, canManage, ctrl.respond);

export default router;
