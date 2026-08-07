import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../middlewares/auth.middleware.ts";
import { requiredRole } from "../../middlewares/role.ts";
import * as ctrl from "./applications.controller.ts";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const canManageApplications = requiredRole(
  "Super Admin",
  "HR Admin",
  "Recruiter",
  "Hiring Manager",
);

router.post(
  "/",
  authenticate,
  canManageApplications,
  upload.single("resume"),
  ctrl.applyWithResume,
);
router.get("/", authenticate, canManageApplications, ctrl.listApplications);
router.get("/:applicationId", authenticate, canManageApplications, ctrl.getApplication);
router.patch(
  "/:applicationId/stage",
  authenticate,
  canManageApplications,
  ctrl.updateStage,
);

export default router;
