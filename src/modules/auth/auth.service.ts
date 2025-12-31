import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/api-error";
import { comparePassword, hashPassword } from "../../utils/password";
import { sign, verify } from "jsonwebtoken";
import crypto from "crypto";
import { MailService } from "../mail/email.service";

const mailService = new MailService();

/*
 * REGISTER
 */
export const registerService = async (body: {
  full_name: string;
  email: string;
  password: string;
  phone_number: string;
  role_id: number;
  referral_code?: string;
}) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: body.email },
  });
  if (existingUser) throw new ApiError("Email already exists", 400);

  const hashedPassword = await hashPassword(body.password);
  const myReferralCode = `REF-${Date.now()}`;

  let referrerId: number | null = null;

  if (body.referral_code) {
    const referrer = await prisma.user.findUnique({
      where: { referral_code: body.referral_code },
    });
    if (!referrer) throw new ApiError("Invalid referral code", 400);
    referrerId = referrer.id;
  }

  const newUser = await prisma.user.create({
    data: {
      full_name: body.full_name,
      email: body.email,
      password: hashedPassword,
      phone_number: body.phone_number,
      role_id: body.role_id,
      referral_code: myReferralCode,
      referrer_id: referrerId,
    },
  });

  if (referrerId) {
    const expiredAt = new Date();
    expiredAt.setMonth(expiredAt.getMonth() + 3);

    const referralEvent = await prisma.event.findFirst();
    if (!referralEvent) throw new ApiError("No event found for coupon", 500);

    const dummyTransaction = await prisma.transactions.findFirst();
    if (dummyTransaction) {
      await prisma.points.create({
        data: {
          user_id: referrerId,
          amount: 10000,
          source: "REFERRAL",
          expires_at: expiredAt,
          transaction_id: dummyTransaction.transaction_id,
        },
      });
    }

    await prisma.coupons.create({
      data: {
        code: `REF-${Date.now()}`,
        discount_amount: 10000,
        discount_name: "Referral Discount",
        quota: 1,
        expires_at: expiredAt,
        event_id: referralEvent.event_id,
      },
    });
  }

  return { message: "Register success" };
};

/*
 * LOGIN
 */
export const loginService = async (body: {
  email: string;
  password: string;
}) => {
  const user = await prisma.user.findUnique({
    where: { email: body.email },
    include: { role: true },
  });

  if (!user) throw new ApiError("Invalid credentials", 400);

  const isPassValid = await comparePassword(body.password, user.password);
  if (!isPassValid) throw new ApiError("Invalid credentials", 400);

  const payload = {
    id: user.id,
    role: user.role.role_name.toUpperCase(),
  };

  const accessToken = sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "4h",
  });

  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: payload.role,
    accessToken,
  };
};

/*
 * FORGOT PASSWORD
 */
export const forgotPasswordService = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { message: "If email exists, reset link has been sent" };
  }

  // token asli (dikirim ke email)
  const resetToken = crypto.randomBytes(32).toString("hex");

  // token yang DISAVE ke database (HASHED)
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      reset_password_token: hashedToken, // SIMPAN HASH
      reset_password_expiry: resetTokenExpiry,
    },
  });

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  // HTML EMAIL YG LEBIH RAPI
  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">
      <h2 style="color:#2c3e50;">Reset Password</h2>

      <p>Halo,</p>

      <p>
        Kami menerima permintaan untuk mereset password akun kamu.
        Klik tombol di bawah ini untuk melanjutkan:
      </p>

      <a
        href="${resetLink}"
        style="
          display:inline-block;
          margin:16px 0;
          padding:12px 20px;
          background:#4f46e5;
          color:#ffffff;
          text-decoration:none;
          border-radius:6px;
          font-weight:bold;
        "
      >
        Reset Password
      </a>

      <p>
        Link ini hanya berlaku selama <b>15 menit</b>.
        Jika kamu tidak merasa melakukan permintaan ini, silakan abaikan email ini.
      </p>

      <hr style="margin:24px 0;" />

      <p style="font-size:12px; color:#777;">
        © ${new Date().getFullYear()} Event App
      </p>
    </div>
  `;

  await mailService.sendEmail(
    user.email,
    "Reset Password",
    html
  );

  return { message: "Reset password link sent to email" };
};


/*
 * RESET PASSWORD
 */
export const resetPasswordService = async (
  token: string,
  newPassword: string
) => {

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      reset_password_token: hashedToken,
      reset_password_expiry: {
        gt: new Date(Date.now()), // aman timezone
      },
    },
  });

  if (!user) {
    throw new ApiError("Invalid or expired token", 400);
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      reset_password_token: null,
      reset_password_expiry: null,
    },
  });

  return { message: "Password reset successful" };
};





