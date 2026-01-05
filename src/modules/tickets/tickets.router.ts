import { Router } from "express";
import { createTicketService } from "./tickets.service";
import { verifyToken } from "../../middlewares/jwt.middleware";

const router = Router();

/*
 * TICKETS
 * Protected route - Organizer only
 */

// Create ticket
router.post("/", verifyToken, async (req, res, next) => {
  try {
    if (res.locals.user.role !== "ORGANIZER") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const organizerUserId = res.locals.user.id;
    const ticket = await createTicketService(organizerUserId, req.body);

    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

export default router;
