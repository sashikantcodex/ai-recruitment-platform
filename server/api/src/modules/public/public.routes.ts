import { Router } from "express";
import multer from "multer";
import * as assessmentsCtrl from "../assessments/assessments.controller.ts";
import * as interviewsCtrl from "../interviews/interviews.controller.ts";
import * as ctrl from "./public.controller.ts";

/**
 * Unauthenticated candidate surface: the careers board, self-service
 * applications, token-gated assessments and token-gated AI interviews.
 */
const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get("/jobs", ctrl.listPostings);
router.get("/jobs/:slug", ctrl.getPosting);
router.post("/jobs/:slug/apply", upload.single("resume"), ctrl.apply);

router.get("/assessments/:token", assessmentsCtrl.publicGetAttempt);
router.post("/assessments/:token/start", assessmentsCtrl.publicStart);
router.post("/assessments/:token/submit", assessmentsCtrl.publicSubmit);

router.get("/interviews/:token", interviewsCtrl.publicGetSession);
router.post("/interviews/:token/start", interviewsCtrl.publicStartSession);
router.post("/interviews/:token/answer", interviewsCtrl.publicAnswer);

export default router;
