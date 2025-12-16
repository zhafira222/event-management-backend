import { Request, Response } from "express";
import {
  createUserService,
  deleteUserService,
  getUserService,
  GetUsersQuery,
  getUsersService,
  updateUserService,
} from "../services/user.service";

export const getUsersController = async (req: Request, res: Response) => {
  const query: GetUsersQuery = {
    page: parseInt(req.query.page as string) || 1,
    take: parseInt(req.query.take as string) || 3,
    sortBy: (req.query.sortBy as string) || "createdAt",
    sortOrder: (req.query.sortOrder as string) || "desc",
    search: (req.query.search as string) || "",
  };

  const result = await getUsersService(query);
  res.status(200).send(result);
};

export const getUserController = async (req: Request, res: Response) => {
  const id = req.params.id; // ✅ UUID string
  const result = await getUserService(id);
  res.status(200).send(result);
};

export const createUserController = async (req: Request, res: Response) => {
  const result = await createUserService(req.body);
  res.status(201).send(result);
};

export const updateUserController = async (req: Request, res: Response) => {
  const id = req.params.id; // ✅ UUID string
  const result = await updateUserService(id, req.body);
  res.status(200).send(result);
};

export const deleteUserController = async (req: Request, res: Response) => {
  const id = req.params.id; // ✅ UUID string
  const result = await deleteUserService(id);
  res.status(200).send(result);
};
