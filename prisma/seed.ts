import { prisma } from "@/lib/prisma"; 
import * as bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding users menggunakan Prisma Client Custom...");
  
  const seedPassword = process.env.SEED_SUPERADMIN_PASSWORD ?? "password123";
  if (process.env.NODE_ENV === "production" && !process.env.SEED_SUPERADMIN_PASSWORD) {
    throw new Error("Di produksi, isi SEED_SUPERADMIN_PASSWORD dulu. Password bawaan tidak boleh dipakai.");
  }
  const seedEmail = (process.env.SEED_SUPERADMIN_EMAIL ?? "superadmin@gmail.com").trim().toLowerCase();
  const hashedPassword = await bcrypt.hash(seedPassword, 10);

  // 1. Super Admin
  await prisma.user.upsert({
    where: { email: seedEmail },
    update: {}, 
    create: {
      name: "Super Admin",
      email: seedEmail,
      password: hashedPassword,
      phone: "081234567890",
      role: "SuperAdmin",
      isVerified: true,
    },
  });

  // // 2. Admin SMK
  // await prisma.user.upsert({
  //   where: { email: "adminsmk@gmail.com" },
  //   update: {},
  //   create: {
  //     name: "Admin SMK",
  //     email: "adminsmk@gmail.com",
  //     password: hashedPassword,
  //     phone: "081234567891",
  //     role: "AdminSMK",
  //   },
  // });

  // // 3. Admin Jurusan
  // await prisma.user.upsert({
  //   where: { email: "adminjurusan@gmail.com" },
  //   update: {},
  //   create: {
  //     name: "Admin Jurusan",
  //     email: "adminjurusan@gmail.com",
  //     password: hashedPassword,
  //     phone: "081234567892",
  //     role: "AdminJurusan",
  //   },
  // });

  // // 4. User Biasa
  // await prisma.user.upsert({
  //   where: { email: "user@gmail.com" },
  //   update: {},
  //   create: {
  //     name: "User Biasa",
  //     email: "user@gmail.com",
  //     password: hashedPassword,
  //     phone: "081234567893",
  //     role: "User",
  //   },
  // });

  console.log("✅ Seeding selesai!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });