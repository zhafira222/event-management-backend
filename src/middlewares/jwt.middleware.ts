import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/api-error";

export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new ApiError("No token provided", 401);
  }

  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    throw new ApiError("Invalid token format", 401);
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { id: number; role: string };

    // 🔥 SIMPAN DI DUA TEMPAT
    (req as any).user = decoded;
    res.locals.user = decoded;

    next();
  } catch (error) {
    throw new ApiError("Invalid or expired token", 401);
  }
};

/**
 * ==========================
 * ROLE-BASED AUTHORIZATION
 * ==========================
 */
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user;

    if (!user) {
      throw new ApiError("Unauthorized", 401);
    }

    if (user.role !== role) {
      throw new ApiError("Forbidden: Access denied", 403);
    }

    next();
  };
};
