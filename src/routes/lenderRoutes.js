import { Router } from "express";
import * as lenderController from "../controllers/lenderController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { updateLenderFileSchema } from "../validators/lenderValidator.js";

const router = Router();

router.use(authenticate, authorizeRoles("admin", "bank_partner"));

router.get("/files", lenderController.listFiles);
router.get("/files/:code", lenderController.getFile);
router.patch("/files/:code", validate(updateLenderFileSchema), lenderController.updateFile);

export default router;
