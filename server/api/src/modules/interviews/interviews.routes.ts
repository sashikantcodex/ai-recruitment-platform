import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.ts";
import { requiredRole } from "../../middlewares/role.ts";
import * as ctrl from "./interviews.controller.ts";

const router = Router();
const canManage = requiredRole(
  "Super Admin",
  "HR Admin",
  "Recruiter",
  "Hiring Manager",
  "Interviewer",
);

router.get("/", authenticate, canManage, ctrl.list);
router.post("/", authenticate, canManage, ctrl.create);
router.get("/:id", authenticate, canManage, ctrl.get);
router.post("/:id/schedule", authenticate, canManage, ctrl.schedule);
router.post("/:id/reschedule", authenticate, canManage, ctrl.reschedule);
router.post("/:id/cancel", authenticate, canManage, ctrl.cancel);
router.post("/:id/reminder", authenticate, canManage, ctrl.reminder);
router.post("/:id/questions", authenticate, canManage, ctrl.questions);
router.post("/:id/scorecard", authenticate, canManage, ctrl.scorecard);
router.post("/:id/notes-summary", authenticate, canManage, ctrl.notesSummary);
router.post("/:id/ai-invite", authenticate, canManage, ctrl.inviteAi);
router.get("/:id/ai-session", authenticate, canManage, ctrl.aiSession);

export default router;
