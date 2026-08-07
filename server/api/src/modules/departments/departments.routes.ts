import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.ts";
import { requiredRole } from "../../middlewares/role.ts";
import * as ctrl from "./departments.controller.ts";

const router = Router();
const canManage = requiredRole("Super Admin", "HR Admin", "Recruiter");

router.get("/", authenticate, ctrl.listDepartments);
router.post("/", authenticate, canManage, ctrl.createDepartment);
router.put("/:id", authenticate, canManage, ctrl.updateDepartment);
router.delete("/:id", authenticate, canManage, ctrl.deleteDepartment);

export default router;
