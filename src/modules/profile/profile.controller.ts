import { Request, Response, NextFunction } from "express";
import {
  updateProfileImageService,
  updateProfileService,
  changePasswordService, // WAJIB
} from "../profile/profile.service";

/* GET PROFILE (SELF)
 * GET /api/profile */
export const getProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // data user hasil decode JWT
    const user = res.locals.user;

    return res.status(200).json({
      message: "Get profile success",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/* UPDATE PROFILE DATA
 * PUT /api/profile */
export const updateProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = res.locals.user.id;

    const result = await updateProfileService(userId, req.body);

    return res.status(200).json({
      message: "Profile updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/* UPLOAD / UPDATE PROFILE IMAGE
 * PUT /api/profile/image */
export const uploadProfileImageController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = res.locals.user.id;

    if (!req.file) {
      return res.status(400).json({
        message: "Image is required",
      });
    }

    const result = await updateProfileImageService(userId, req.file);

    return res.status(200).json({
      message: "Profile image updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/* CHANGE PASSWORD
 * PUT /api/profile/change-password */
export const changePasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = res.locals.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        message: "Old password and new password are required",
      });
    }

    const result = await changePasswordService(
      userId,
      oldPassword,
      newPassword
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
