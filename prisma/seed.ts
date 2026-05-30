import { prisma } from "@/lib/prisma"; 
import * as bcrypt from "bcrypt";

async function main() {
  console.log("Seeding users menggunakan Prisma Client Custom...");
  
  const hashedPassword = await bcrypt.hash("password123", 10);

  // 1. Super Admin
  await prisma.user.upsert({
    where: { email: "superadmin@gmail.com" },
    update: {}, 
    create: {
      name: "Super Admin",
      email: "superadmin@gmail.com",
      password: hashedPassword,
      phone: "081234567890",
      role: "SuperAdmin",
    },
  });

  // 2. Admin SMK
  await prisma.user.upsert({
    where: { email: "adminsmk@gmail.com" },
    update: {},
    create: {
      name: "Admin SMK",
      email: "adminsmk@gmail.com",
      password: hashedPassword,
      phone: "081234567891",
      role: "AdminSMK",
    },
  });

  // 3. Admin Jurusan
  await prisma.user.upsert({
    where: { email: "adminjurusan@gmail.com" },
    update: {},
    create: {
      name: "Admin Jurusan",
      email: "adminjurusan@gmail.com",
      password: hashedPassword,
      phone: "081234567892",
      role: "AdminJurusan",
    },
  });

  // 4. User Biasa
  await prisma.user.upsert({
    where: { email: "user@gmail.com" },
    update: {},
    create: {
      name: "User Biasa",
      email: "user@gmail.com",
      password: hashedPassword,
      phone: "081234567893",
      role: "User",
    },
  });

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