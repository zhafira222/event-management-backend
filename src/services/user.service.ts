import { Prisma, profiles } from "@prisma/client";
import { prisma } from "../config/prisma";
import { PaginationQueryParams } from "../types/pagination";
import { ApiError } from "../utils/api-error";

export interface GetUsersQuery extends PaginationQueryParams {
  search?: string;
}

export const getUsersService = async (query: GetUsersQuery) => {
  const { page, take, sortBy, sortOrder, search } = query;

  const whereClause: Prisma.profilesWhereInput = {};

  if (search) {
    whereClause.full_name = {
      contains: search,
      mode: "insensitive",
    };
  }

  const users = await prisma.profiles.findMany({
    where: whereClause,
    skip: (page - 1) * take,
    take,
    orderBy: sortBy
      ? { [sortBy]: sortOrder }
      : { createdAt: "desc" },
  });

  const total = await prisma.profiles.count({ where: whereClause });

  return {
    data: users,
    meta: { page, take, total },
  };
};

export const getUserService = async (user_id: string) => {
  const user = await prisma.profiles.findUnique({
    where: { user_id },
  });

  if (!user) {
    throw new ApiError("user not found", 404);
  }

  return user;
};

export const createUserService = async (
  body: Prisma.profilesCreateInput
) => {
  const user = await prisma.profiles.create({
    data: body,
  });

  return user;
};

export const updateUserService = async (
  user_id: string,
  body: Prisma.profilesUpdateInput
) => {
  await getUserService(user_id);

  const updatedUser = await prisma.profiles.update({
    where: { user_id },
    data: body,
  });

  return updatedUser;
};

export const deleteUserService = async (user_id: string) => {
  await getUserService(user_id);

  await prisma.profiles.delete({
    where: { user_id },
  });

  return { message: "delete user success" };
};
