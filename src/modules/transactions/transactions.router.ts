import { Router } from "express";
import { verifyToken } from "../../middlewares/jwt.middleware";
import { createTransactionController } from "./transactions.controller";

const router = Router();

router.post("/", verifyToken, createTransactionController);

export default router;
