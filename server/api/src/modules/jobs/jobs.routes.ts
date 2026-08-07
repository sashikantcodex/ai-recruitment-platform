import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.ts";
import { requiredRole } from "../../middlewares/role.ts";
import * as ctrl from "./jobs.controller.ts";

const router = Router();

const canManageJobs = requiredRole(
  "Super Admin",
  "HR Admin",
  "Recruiter",
  "Hiring Manager",
);

router.post("/", authenticate, canManageJobs, ctrl.createJob);
router.get("/", ctrl.getJobs);
router.get("/:id/rankings", authenticate, canManageJobs, ctrl.getRankings);
router.get("/:id", ctrl.getJobById);
router.put("/:id", authenticate, canManageJobs, ctrl.updateJob);
router.delete("/:id", authenticate, canManageJobs, ctrl.deleteJob);
router.post("/:id/submit", authenticate, canManageJobs, ctrl.submitJob);
router.post("/:id/approve", authenticate, canManageJobs, ctrl.approveJob);
router.post("/:id/close", authenticate, canManageJobs, ctrl.closeJob);

export default router;
