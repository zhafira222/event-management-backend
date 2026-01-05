import express from "express";
import {
  getProfileController,
  updateProfileController,
  uploadProfileImageController,
  changePasswordController,
} from "../profile/profile.controller";
import { verifyToken } from "../../middlewares/jwt.middleware";

const router = express.Router();

/*
 * GET PROFILE (SELF)
 * GET /api/profile
 */
router.get("/", verifyToken, getProfileController);

/*
 * UPDATE PROFILE (SELF)
 * PUT /api/profile
 */
router.put("/", verifyToken, updateProfileController);

/*
 * UPDATE PROFILE IMAGE
 * PUT /api/profile/image
 * Protected (JWT required)
 */
router.put(
  "/image",
  verifyToken,
  uploadProfileImageController
);

/* CHANGE PASSWORD */
router.put(
  "/change-password",
  verifyToken,
  changePasswordController
);

export default router;
