import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.ts";
import { requiredRole } from "../../middlewares/role.ts";
import * as ctrl from "./sourcing.controller.ts";

const router = Router();
const canManage = requiredRole("Super Admin", "HR Admin", "Recruiter", "Hiring Manager");

router.get("/campaigns", authenticate, canManage, ctrl.list);
router.post("/campaigns", authenticate, canManage, ctrl.create);
router.get("/campaigns/:id", authenticate, canManage, ctrl.get);
router.post("/campaigns/:id/search", authenticate, canManage, ctrl.search);
router.post("/campaigns/:id/prospects", authenticate, canManage, ctrl.addProspect);
router.post(
  "/campaigns/:id/prospects/:prospectId/contact",
  authenticate,
  canManage,
  ctrl.contact,
);
router.patch(
  "/campaigns/:id/prospects/:prospectId/status",
  authenticate,
  canManage,
  ctrl.updateStatus,
);
router.post(
  "/campaigns/:id/prospects/:prospectId/convert",
  authenticate,
  canManage,
  ctrl.convert,
);

export default router;
