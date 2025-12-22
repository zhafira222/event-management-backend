import { Request, Response, NextFunction } from "express";
import {
  loginService,
  registerService,
  forgotPasswordService,
  resetPasswordService,
} from "../auth/auth.service";

/*
 * REGISTER
 */
export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await registerService(req.body);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/*
 * LOGIN
 */
export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await loginService(req.body);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/*
 * FORGOT PASSWORD
 * POST /api/auth/forgot-password
 */
export const forgotPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const result = await forgotPasswordService(email);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/*
 * RESET PASSWORD
 * POST /api/auth/reset-password
 */
export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: "Token and new password are required",
      });
    }

    const result = await resetPasswordService(token, newPassword);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
