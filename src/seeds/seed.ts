// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// async function main() {
//   console.log("Seeding database...");

 
//   // ROLES

//   const adminRole = await prisma.roles.create({
//     data: { role_name: "admin", updated_at: new Date() },
//   });

//   const userRole = await prisma.roles.create({
//     data: { role_name: "user", updated_at: new Date() },
//   });


//   // USERS

//   const admin = await prisma.user.create({
//     data: {
//       full_name: "Admin User",
//       email: "admin@example.com",
//       password: "hashedpassword",
//       phone_number: "08123456789",
//       role_id: adminRole.role_id,
//       updated_at: new Date(),
//     },
//   });

//   const user1 = await prisma.user.create({
//     data: {
//       full_name: "Budi Santoso",
//       email: "budi@example.com",
//       password: "hashedpassword",
//       phone_number: "08987654321",
//       role_id: userRole.role_id,
//       referrer_id: admin.id,
//       updated_at: new Date(),
//     },
//   });

 
//   // // CATEGORIES

//   // const musicCategory = await prisma.categories.create({
//   //   data: {
//   //     category_name: "Music",
//   //     category_field: "music",
//   //     updated_at: new Date(),
//   //   },
//   // });


//   // // ORGANIZER
 
//   // const organizer = await prisma.organizers.create({
//   //   data: {
//   //     user_id: admin.id,
//   //     organization_name: "Event Nusantara",
//   //     description: "Organizer event musik & budaya",
//   //     updated_at: new Date(),
//   //   },
//   // });


//   // // EVENT

//   // const event = await prisma.event.create({
//   //   data: {
//   //     title: "Konser Indie 2025",
//   //     description: "Konser musik indie terbesar",
//   //     start_date: new Date("2025-12-20"),
//   //     end_date: new Date("2025-12-21"),
//   //     location: "Jakarta",
//   //     image: "event.jpg",
//   //     organizer_id: organizer.organizer_id,
//   //     category_id: musicCategory.category_id,
//   //     updated_at: new Date(),
//   //   },
//   // });


//   // // TICKET

//   // const ticket = await prisma.tickets.create({
//   //   data: {
//   //     event_id: event.event_id,
//   //     name: "Regular",
//   //     price: 150000,
//   //     stock: 100,
//   //     description: "Tiket reguler",
//   //     updated_at: new Date(),
//   //   },
//   // });

 
//   // // COUPON

//   // const coupon = await prisma.coupons.create({
//   //   data: {
//   //     code: "DISCOUNT10",
//   //     discount_amount: 10,
//   //     discount_name: "Diskon 10%",
//   //     quota: 50,
//   //     expires_at: new Date("2025-12-31"),
//   //     event_id: event.event_id,
//   //     updatedAt: new Date(),
//   //   },
//   // });


//   // // TRANSACTION

//   // const transaction = await prisma.transactions.create({
//   //   data: {
//   //     ticket_id: ticket.ticket_id,
//   //     user_id: user1.id,
//   //     event_id: event.event_id,
//   //     qty: 1,
//   //     total_price: 150000,
//   //     status: "paid",
//   //     coupon_id: coupon.coupon_id,
//   //     payment_deadline: new Date(),
//   //     confirmation_deadline: new Date(),
//   //     base_price_at_time_buy: 150000,
//   //     updated_at: new Date(),
//   //   },
//   // });


//   // // PAYMENT
 
//   // await prisma.payments.create({
//   //   data: {
//   //     payment_time: new Date(),
//   //     image_url: "payment.png",
//   //     transaction_id: transaction.transaction_id,
//   //     updated_at: new Date(),
//   //   },
//   // });


//   // // POINTS

//   // await prisma.points.create({
//   //   data: {
//   //     amount: 50,
//   //     source: "purchase",
//   //     expires_at: new Date("2026-01-01"),
//   //     user_id: user1.id,
//   //     transaction_id: transaction.transaction_id,
//   //     updated_at: new Date(),
//   //   },
//   // });


//   // // REVIEW

//   // await prisma.reviews.create({
//   //   data: {
//   //     rating: 5,
//   //     comment: "Eventnya keren banget!",
//   //     user_id: user1.id,
//   //     event_id: event.event_id,
//   //     transaction_id: transaction.transaction_id,
//   //     updated_at: new Date(),
//   //   },
//   // });

//   console.log("Seeding selesai!");
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });


import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../utils/password";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const DEFAULT_PASSWORD = "Admin@1234";
  const hashed = await hashPassword(DEFAULT_PASSWORD);

  // 1) Ambil roles yang sudah ada
  const [superAdminRole, organizerRole, normalUserRole] = await Promise.all([
    prisma.roles.findFirst({ where: { role_name: "Super Admin" }, select: { role_id: true } }),
    prisma.roles.findFirst({ where: { role_name: "Organizer" }, select: { role_id: true } }),
    prisma.roles.findFirst({ where: { role_name: "Normal_User" }, select: { role_id: true } }),
  ]);

  if (!superAdminRole) throw new Error('Role "Super Admin" tidak ditemukan di tabel roles.');
  if (!organizerRole) throw new Error('Role "Organizer" tidak ditemukan di tabel roles.');
  if (!normalUserRole) throw new Error('Role "Normal_User" tidak ditemukan di tabel roles.');

  // 2) Seed USERS (upsert biar aman kalau dijalankan berkali-kali)

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      full_name: "Super Admin",
      phone_number: "08123456789",
      role_id: superAdminRole.role_id,
      password: hashed,
    },
    create: {
      full_name: "Super Admin",
      email: "admin@example.com",
      password: hashed,
      phone_number: "08123456789",
      role_id: superAdminRole.role_id,
    },
  });

  const organizerUser = await prisma.user.upsert({
    where: { email: "organizer@example.com" },
    update: {
      full_name: "Organizer User",
      phone_number: "082222222222",
      role_id: organizerRole.role_id,
      password: hashed,
      referrer_id: superAdmin.id,
    },
    create: {
      full_name: "Organizer User",
      email: "organizer@example.com",
      password: hashed,
      phone_number: "082222222222",
      role_id: organizerRole.role_id,
      referrer_id: superAdmin.id,
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: "budi@example.com" },
    update: {
      full_name: "Budi Santoso",
      phone_number: "08987654321",
      role_id: normalUserRole.role_id,
      password: hashed,
      referrer_id: superAdmin.id,
    },
    create: {
      full_name: "Budi Santoso",
      email: "budi@example.com",
      password: hashed,
      phone_number: "08987654321",
      role_id: normalUserRole.role_id,
      referrer_id: superAdmin.id,
    },
  });

  console.log("Seed users done:", {
    superAdmin: superAdmin.email,
    organizer: organizerUser.email,
    user1: user1.email,
  });

  console.log("Seeding selesai!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });