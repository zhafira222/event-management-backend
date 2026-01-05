import express from "express";
import {
  getUsersController,
  getUserController,
  updateUserController,
} from "./user.controller";
import { verifyToken, requireRole } from "../../middlewares/jwt.middleware";

const router = express.Router();

/*
 * USER ROUTES (PROTECTED)
 * Semua endpoint di bawah ini WAJIB login
 */

/*
 * GET ALL USERS
 * - Hanya ORGANIZER
 * - Biasanya untuk dashboard organizer (lihat attendee)
 */
router.get(
  "/",
  verifyToken,
  requireRole("ORGANIZER"),
  getUsersController
);

/*
 * GET USER BY ID
 * - ORGANIZER bisa lihat user detail
 */
router.get(
  "/:id",
  verifyToken,
  requireRole("ORGANIZER"),
  getUserController
);

/*
 * UPDATE USER PROFILE
 * - CUSTOMER update profil sendiri
 * - ORGANIZER update data dirinya sendiri
 */
router.put(
  "/:id",
  verifyToken,
  updateUserController
);

/*
 * X CREATE USER
 * X DELETE USER
 * Tidak disediakan karena:
 * - User hanya dibuat lewat /auth/register
 * - Tidak ada admin sistem di Feature 2
 */

export default router;
