import express from "express";
import {
  loginController,
  registerController,
  forgotPasswordController,
  resetPasswordController,
} from "../auth/auth.controller";

const router = express.Router();

/*
 * AUTH ROUTES (PUBLIC)
 * - Register user
 * - Login user
 * - Forgot password
 * - Reset password
 * Tidak membutuhkan JWT
 */

// Register endpoint
router.post("/register", registerController);

// Login endpoint
router.post("/login", loginController);

// Forgot password (kirim email reset)
router.post("/forgot-password", forgotPasswordController);

// Reset password (pakai token)
router.post("/reset-password", resetPasswordController);

export default router;
