import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@dailycook.local";
  const adminPass = await argon2.hash("Admin@123");

  // Tạo admin
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminPass,
      name: "Administrator",
      role: "ADMIN",
    },
  });

  // Một số nguyên liệu mẫu
  const rice = await prisma.ingredient.upsert({
    where: { id: "seed_rice" },
    update: {},
    create: { id: "seed_rice", name: "Gạo", unit: "g", kcal: 130 },
  });
  const chicken = await prisma.ingredient.upsert({
    where: { id: "seed_chicken" },
    update: {},
    create: { id: "seed_chicken", name: "Ức gà", unit: "g", kcal: 165 },
  });
  const egg = await prisma.ingredient.upsert({
    where: { id: "seed_egg" },
    update: {},
    create: { id: "seed_egg", name: "Trứng", unit: "cái", kcal: 70 },
  });

  // Recipe mẫu
  await prisma.recipe.create({
    data: {
      authorId: admin.id,
      title: "Cơm gà xé",
      description: "Đơn giản, giàu đạm",
      steps: ["Luộc ức gà", "Xé nhỏ", "Ăn kèm cơm trắng"],
      tags: ["ăn trưa", "high-protein"],
      items: {
        create: [
          { ingredientId: rice.id, amount: 200 },
          { ingredientId: chicken.id, amount: 150 },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      authorId: admin.id,
      title: "Trứng ốp la",
      steps: ["Rán trứng chín vừa"],
      tags: ["ăn sáng", "nhanh"],
      items: {
        create: [{ ingredientId: egg.id, amount: 2, unitOverride: "cái" }],
      },
    },
  });

  console.log("✅ Seed done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
