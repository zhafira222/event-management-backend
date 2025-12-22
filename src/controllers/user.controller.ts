import { Request, Response, NextFunction } from "express";
import {
  getUserService,
  GetUsersQuery,
  getUsersService,
  updateUserService,
} from "../services/user.service";
import { ApiError } from "../utils/api-error";

/*
 * GET USERS CONTROLLER
 * - Digunakan oleh ORGANIZER
 * - Biasanya untuk melihat attendee / daftar user
 */
export const getUsersController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const query: GetUsersQuery = {
      page: parseInt(req.query.page as string) || 1,
      take: parseInt(req.query.take as string) || 10,
      sortBy: (req.query.sortBy as string) || "created_at",
      sortOrder: (req.query.sortOrder as string) || "desc",
      search: (req.query.search as string) || "",
    };

    const result = await getUsersService(query);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/*
 * GET USER BY ID CONTROLLER
 * - ORGANIZER bisa lihat detail user
 */
export const getUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const result = await getUserService(id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/*
 * UPDATE USER PROFILE CONTROLLER
 * - CUSTOMER / ORGANIZER hanya boleh update PROFIL SENDIRI
 * - Role & referral code TIDAK boleh diubah
 */
export const updateUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userIdFromToken = res.locals.user.id;
    const userIdFromParam = Number(req.params.id);

    // Proteksi: user hanya boleh update dirinya sendiri
    if (userIdFromToken !== userIdFromParam) {
      throw new ApiError("Forbidden access", 403);
    }

    const result = await updateUserService(userIdFromParam, req.body);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
