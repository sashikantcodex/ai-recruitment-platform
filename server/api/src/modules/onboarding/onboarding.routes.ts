import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../middlewares/auth.middleware.ts";
import { requiredRole } from "../../middlewares/role.ts";
import * as ctrl from "./onboarding.controller.ts";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const canManage = requiredRole("Super Admin", "HR Admin", "Recruiter");

router.get("/", authenticate, canManage, ctrl.list);
router.get("/:id", authenticate, canManage, ctrl.get);
router.patch("/:id/checklist", authenticate, canManage, ctrl.toggleChecklist);
router.post("/:id/documents/verify", authenticate, canManage, ctrl.verifyDocument);
router.post(
  "/:id/documents/upload",
  authenticate,
  canManage,
  upload.single("file"),
  ctrl.uploadDocument,
);

export default router;
