import { Router } from "express";
import {
  createUserController,
  deleteUserController,
  getUserController,
  getUsersController,
  updateUserController,
} from "../controllers/user.controller";

const router = Router();

router.get("/", getUsersController);
router.get("/:id", getUserController); // id = UUID (string)
router.post("/", createUserController);
router.patch("/:id", updateUserController);
router.delete("/:id", deleteUserController);

export default router;
