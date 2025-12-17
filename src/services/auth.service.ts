import { profile } from "console";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { comparePassword, hashPassword } from "../utils/password";
import { sign } from "jsonwebtoken";

export const registerService = async (body: {
  full_name: string;
  email: string;
  password: string;
  phone_number: number;      // wajib karena field Decimal NOT NULL
  role_id: number;           // wajib, dikirim frontend
  referral_code?: string;    // optional
}) => {

  // 1. Cek email
  const existingUser = await prisma.profiles.findFirst({
    where: { email: body.email },
  });
  if (existingUser) throw new ApiError("Email already exists", 400);

  // 2. Hash password
  const hashedPassword = await hashPassword(body.password);

  // 3. Siapkan data user baru
  const newUserData = {
    full_name: body.full_name,
    email: body.email,
    password: hashedPassword,        // gunakan password hasil hash
    phone_number: body.phone_number,
    role_id: body.role_id,
    referral_code: body.referral_code ?? null,
    // createdAt & updatedAt otomatis
  };

  // 4. Create data user baru di database
  await prisma.profiles.create({
    data: newUserData,
  });

  return { message: "Register success" };
};

export const loginService = async (
  body: {
  full_name: string;
  email: string;
  password: string;
  phone_number: number;      // wajib karena field Decimal NOT NULL
  role_id: number;           // wajib, dikirim frontend
  referral_code?: string;    // optional
}) => {
  // 1. cek di db ada apa tidak emailnya
  const user = await prisma.profiles.findFirst({where: {email: body.email}});

  // 2. kalo tdak ada throw error
  if (!user) throw new ApiError("Invalid credentials",400);

  // 3. cek passwordnya valid atau tidak
  const isPassValid = await comparePassword (body.password, profiles.password);

  // 4. kalo passwordnya tidak valid throw error
  if (!isPassValid) throw new ApiError("Invalid credentials",400);

  // 5. generate access token
const payload = { id: user.role_id, role:user.role_id};
const accessToken=sign(payload,"rahasia", {expiresIn: "2h"});
  // 6. return data usernya beserta tokennya
  const {password, ...userWithouutPassword}=user;
  return {...userWithouutPassword,accessToken};
}; 