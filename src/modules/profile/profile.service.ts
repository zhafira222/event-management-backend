import { prisma } from "../../config/prisma";
import cloudinary from "../../config/cloudinary";
import { ApiError } from "../../utils/api-error";
import { comparePassword, hashPassword } from "../../utils/password";

export const updateProfileService = async (
  userId: number,
  body: {
    full_name?: string;
    phone_number?: string;
  }
) => {
  // cek user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new ApiError("User not found", 404);

  // update data
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      full_name: body.full_name,
      phone_number: body.phone_number,
    },
    select: {
      id: true,
      full_name: true,
      email: true,
      phone_number: true,
      role_id: true,
    },
  });

  return updatedUser;
};

/*
 * Upload profile image ke Cloudinary
 * dan update kolom profile_image di user
 */
export const updateProfileImageService = async (
  userId: number,
  file: Express.Multer.File
) => {
  const uploadResult = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: "profile-images" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      )
      .end(file.buffer);
  });

  if (!uploadResult?.secure_url) {
    throw new ApiError("Failed to upload image", 500);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      profile_image: uploadResult.secure_url,
    },
  });

  return user;
};

/*
 * CHANGE PASSWORD
 */
export const changePasswordService = async (
  userId: number,
  oldPassword: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new ApiError("User not found", 404);

  const isValid = await comparePassword(oldPassword, user.password);
  if (!isValid) {
    throw new ApiError("Old password is incorrect", 400);
  }

  const hashedNewPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedNewPassword,
    },
  });

  return {
    message: "Password updated successfully",
  };
};
