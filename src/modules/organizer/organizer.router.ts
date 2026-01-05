import { Router } from "express";
import {
  getOrganizerEventsService,
  getOrganizerTransactionsService,
  acceptTransactionService,
  rejectTransactionService,
  getEventAttendeesService,
  getOrganizerStatsService,
  createEventService,
  createOrganizerProfileService,
} from "./organizer.service";
import { verifyToken } from "../../middlewares/jwt.middleware";

const router = Router();

/*
 * ORGANIZER DASHBOARD
 * Semua route PROTECTED
 */

/**
 * CREATE ORGANIZER PROFILE
 * WAJIB sebelum create event
 * POST /api/organizer/profile
 */
router.post("/profile", verifyToken, async (req, res, next) => {
  try {
    if (res.locals.user.role !== "ORGANIZER") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const userId = res.locals.user.id;

    const data = await createOrganizerProfileService(userId, req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * CREATE EVENT
 * POST /api/organizer/events
 */
router.post("/events", verifyToken, async (req, res, next) => {
  try {
    if (res.locals.user.role !== "ORGANIZER") {
      return res.status(403).json({ message: "Forbidden" });
    }

    // PAKAI USER ID, BUKAN ORGANIZER ID
    const userId = res.locals.user.id;

    const data = await createEventService(userId, req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

/*
 * DASHBOARD ACCESS CHECK
 * POST /api/organizer
 */
router.post("/", verifyToken, async (req, res, next) => {
  try {
    if (res.locals.user.role !== "ORGANIZER") {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.status(200).json({
      message: "Organizer dashboard access granted",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET ORGANIZER EVENTS
 * GET /api/organizer/events
 */
router.get("/events", verifyToken, async (req, res, next) => {
  try {
    if (res.locals.user.role !== "ORGANIZER") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const userId = res.locals.user.id;
    const data = await getOrganizerEventsService(userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET ORGANIZER TRANSACTIONS
 * GET /api/organizer/transactions
 */
router.get("/transactions", verifyToken, async (req, res, next) => {
  try {
    const userId = res.locals.user.id;
    const data = await getOrganizerTransactionsService(userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * ACCEPT TRANSACTION
 * PATCH /api/organizer/transactions/:id/accept
 */
router.patch(
  "/transactions/:id/accept",
  verifyToken,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const data = await acceptTransactionService(id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * REJECT TRANSACTION
 * PATCH /api/organizer/transactions/:id/reject
 */
router.patch(
  "/transactions/:id/reject",
  verifyToken,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const data = await rejectTransactionService(id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * EVENT ATTENDEES
 * GET /api/organizer/events/:eventId/attendees
 */
router.get(
  "/events/:eventId/attendees",
  verifyToken,
  async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const data = await getEventAttendeesService(eventId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * ORGANIZER STATISTICS
 * GET /api/organizer/stats
 */
router.get("/stats", verifyToken, async (req, res, next) => {
  try {
    const userId = res.locals.user.id;
    const data = await getOrganizerStatsService(userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
