import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.ts";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import * as ctrl from "./auth.controller.ts";

const router = Router();

router.post("/register", ctrl.registerUser); // public; role limited to PUBLIC_REGISTER_ROLES
router.post("/login", ctrl.loginUser);
router.post("/logout", authenticate, ctrl.logoutUser);
router.post("/refresh-token", ctrl.refreshToken);
router.get("/me", authenticate, asyncHandler(ctrl.me));

export default router;
