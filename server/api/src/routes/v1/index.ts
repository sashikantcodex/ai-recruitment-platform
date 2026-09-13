import { Router } from "express";
import authRoutes from "../../modules/auth/auth.routes.ts";
import jobsRoutes from "../../modules/jobs/jobs.routes.ts";
import applicationsRoutes from "../../modules/applications/applications.routes.ts";
import departmentsRoutes from "../../modules/departments/departments.routes.ts";
import templatesRoutes from "../../modules/templates/templates.routes.ts";
import candidatesRoutes from "../../modules/candidates/candidates.routes.ts";
import interviewsRoutes from "../../modules/interviews/interviews.routes.ts";
import offersRoutes from "../../modules/offers/offers.routes.ts";
import onboardingRoutes from "../../modules/onboarding/onboarding.routes.ts";
import knowledgeRoutes from "../../modules/knowledge/knowledge.routes.ts";
import agentsRoutes from "../../modules/agents/agents.routes.ts";
import sourcingRoutes from "../../modules/sourcing/sourcing.routes.ts";
import assessmentsRoutes from "../../modules/assessments/assessments.routes.ts";
import evaluationsRoutes from "../../modules/evaluations/evaluations.routes.ts";
import publicRoutes from "../../modules/public/public.routes.ts";

/**
 * Versioned REST surface: `/api/v1/*`
 * Keep new domain modules mounted here so the client has one stable base URL.
 */
const router = Router();

router.use("/auth", authRoutes);
router.use("/jobs", jobsRoutes);
router.use("/applications", applicationsRoutes);
router.use("/departments", departmentsRoutes);
router.use("/templates", templatesRoutes);
router.use("/candidates", candidatesRoutes);
router.use("/interviews", interviewsRoutes);
router.use("/offers", offersRoutes);
router.use("/onboarding", onboardingRoutes);
router.use("/knowledge", knowledgeRoutes);
router.use("/agents", agentsRoutes);
router.use("/sourcing", sourcingRoutes);
router.use("/assessments", assessmentsRoutes);
router.use("/evaluations", evaluationsRoutes);
// Unauthenticated candidate surface (careers board, self-apply, token-gated tests).
router.use("/public", publicRoutes);

export default router;
