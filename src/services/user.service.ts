import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { PaginationQueryParams } from "../modules/pagination/dto/pagination";
import { ApiError } from "../utils/api-error";

// QUERY GET USERS (LIST + SEARCH)
// ORGANIZER ONLY (via router)

export interface GetUsersQuery extends PaginationQueryParams {
  search?: string;
}

export const getUsersService = async (query: GetUsersQuery) => {
  const { page, take, sortBy, sortOrder, search } = query;

  const where: Prisma.userWhereInput = {};

  // Search by full name
  if (search) {
    where.full_name = {
      contains: search,
      mode: "insensitive",
    };
  }

  // Sorting
  const orderBy: Prisma.userOrderByWithRelationInput = sortBy
    ? { [sortBy]: sortOrder }
    : { created_at: "desc" };

  // Fetch users WITHOUT sensitive fields
  const users = await prisma.user.findMany({
    where,
    skip: (page - 1) * take,
    take,
    orderBy,
    select: {
      id: true,
      full_name: true,
      email: true,
      phone_number: true,
      created_at: true,
      role: {
        select: {
          role_name: true,
        },
      },
    },
  });

  const total = await prisma.user.count({ where });

  return {
    data: users,
    meta: {
      page,
      take,
      total,
    },
  };
};


// GET USER BY ID
// ORGANIZER ONLY (via router)

export const getUserService = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      full_name: true,
      email: true,
      phone_number: true,
      profile_image: true,
      created_at: true,
      role: {
        select: {
          role_name: true,
        },
      },
    },
  });

  if (!user) throw new ApiError("User not found", 404);

  return user;
};


// UPDATE USER PROFILE
// CUSTOMER & ORGANIZER (self only)

export const updateUserService = async (
  id: number,
  body: Prisma.userUpdateInput
) => {
  // Pastikan user exist
  await prisma.user.findUnique({
    where: { id },
  });

  // ❗ Whitelist field yang boleh diupdate
  const allowedData: Prisma.userUpdateInput = {
    full_name: body.full_name,
    phone_number: body.phone_number,
    profile_image: body.profile_image,
  };

  const updatedUser = await prisma.user.update({
    where: { id },
    data: allowedData,
    select: {
      id: true,
      full_name: true,
      email: true,
      phone_number: true,
      profile_image: true,
      updated_at: true,
    },
  });

  return updatedUser;
};
