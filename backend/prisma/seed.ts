import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

type IngredientSeed = {
  name: string;
  unit: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

type RecipeSeed = {
  title: string;
  description: string;
  region: string;
  tags: string[];
  image: string;
  cookTime: number;
  ingredients: { name: string; amount: number; unit: string }[];
  steps: string[];
};

// ========== INGREDIENTS ==========
const ingredients: IngredientSeed[] = [
  { name: "Gạo", unit: "g", kcal: 130, protein: 2.7, fat: 0.3, carbs: 28 },
  { name: "Thịt heo", unit: "g", kcal: 242, protein: 27, fat: 14, carbs: 0 },
  { name: "Thịt bò", unit: "g", kcal: 250, protein: 26, fat: 15, carbs: 0 },
  { name: "Thịt gà", unit: "g", kcal: 239, protein: 27, fat: 14, carbs: 0 },
  { name: "Cá basa", unit: "g", kcal: 120, protein: 23, fat: 3, carbs: 0 },
  { name: "Cá lóc", unit: "g", kcal: 105, protein: 22, fat: 2, carbs: 0 },
  { name: "Tôm", unit: "g", kcal: 99, protein: 24, fat: 0.3, carbs: 0.2 },
  { name: "Trứng gà", unit: "quả", kcal: 68, protein: 6, fat: 5, carbs: 0.6 },
  { name: "Rau muống", unit: "g", kcal: 20, protein: 2, fat: 0.3, carbs: 3 },
  { name: "Cà rốt", unit: "g", kcal: 41, protein: 0.9, fat: 0.2, carbs: 10 },
  { name: "Khoai tây", unit: "g", kcal: 77, protein: 2, fat: 0.1, carbs: 17 },
  { name: "Đậu hũ", unit: "g", kcal: 76, protein: 8, fat: 4, carbs: 2 },
  { name: "Đậu phộng", unit: "g", kcal: 567, protein: 26, fat: 49, carbs: 16 },
  { name: "Cà chua", unit: "g", kcal: 18, protein: 0.9, fat: 0.2, carbs: 4 },
  { name: "Dầu ăn", unit: "tbsp", kcal: 120, protein: 0, fat: 14, carbs: 0 },
  { name: "Nước mắm", unit: "tbsp", kcal: 10, protein: 1, fat: 0, carbs: 0 },
  { name: "Đường", unit: "tbsp", kcal: 48, protein: 0, fat: 0, carbs: 12 },
  { name: "Muối", unit: "tsp", kcal: 0, protein: 0, fat: 0, carbs: 0 },
  { name: "Tỏi", unit: "g", kcal: 149, protein: 6, fat: 0.5, carbs: 33 },
  { name: "Hành tím", unit: "g", kcal: 40, protein: 1, fat: 0.1, carbs: 9 },
];

// ========== RECIPES (30 món) ==========
const recipes: RecipeSeed[] = [
  {
    title: "Phở bò Hà Nội",
    description: "Nước dùng trong, ngọt xương, hương quế hồi đặc trưng.",
    region: "Northern",
    tags: ["Soup", "Breakfast", "Northern"],
    image:
      "https://cdn.tgdd.vn/Files/2022/01/25/1412805/cach-nau-pho-bo-nam-dinh-chuan-vi-thom-ngon-nhu-hang-quan-202201250313281452.jpg",
    cookTime: 45,
    ingredients: [
      { name: "Thịt bò", amount: 200, unit: "g" },
      { name: "Gạo", amount: 100, unit: "g" },
      { name: "Hành tím", amount: 20, unit: "g" },
    ],
    steps: [
      "Hầm xương bò với hành, quế, hồi.",
      "Luộc bánh phở, chan nước dùng, thêm thịt bò.",
    ],
  },
  {
    title: "Bún chả Hà Nội",
    description: "Thịt nướng than hoa, ăn kèm bún, nước chấm chua ngọt.",
    region: "Northern",
    tags: ["RiceSide", "Grilled", "Northern"],
    image:
      "https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(75)/2024_1_13_638407567967930759_tong-hop-cac-cach-an-bun-cha-ha-noi-chuan-4.png",
    cookTime: 30,
    ingredients: [
      { name: "Thịt heo", amount: 150, unit: "g" },
      { name: "Gạo", amount: 100, unit: "g" },
      { name: "Nước mắm", amount: 2, unit: "tbsp" },
    ],
    steps: [
      "Ướp thịt, nướng than hoa.",
      "Ăn kèm bún, rau sống và nước mắm pha.",
    ],
  },
  {
    title: "Nem rán (Chả giò Bắc)",
    description: "Vỏ giòn, nhân thịt băm, mộc nhĩ, miến, cà rốt.",
    region: "Northern",
    tags: ["Fried", "RiceSide", "Northern"],
    image:
      "https://daotaobeptruong.vn/wp-content/uploads/2020/01/nem-ran-ha-noi.jpg",
    cookTime: 25,
    ingredients: [
      { name: "Thịt heo", amount: 100, unit: "g" },
      { name: "Cà rốt", amount: 50, unit: "g" },
      { name: "Dầu ăn", amount: 1, unit: "tbsp" },
    ],
    steps: ["Trộn nhân, cuốn bánh tráng, chiên vàng giòn."],
  },
  {
    title: "Cá kho tộ",
    description: "Món truyền thống miền Nam, vị đậm đà ăn cùng cơm trắng.",
    region: "Southern",
    tags: ["Stew", "RiceSide", "Southern"],
    image:
      "https://cdn.tgdd.vn/Files/2021/02/23/1329799/bi-quyet-nau-ca-kho-to-ngon-chuan-vi-ca-dai-mau-sac-chuan-dep-202208271627215315.jpg",
    cookTime: 40,
    ingredients: [
      { name: "Cá basa", amount: 200, unit: "g" },
      { name: "Nước mắm", amount: 2, unit: "tbsp" },
      { name: "Đường", amount: 1, unit: "tbsp" },
    ],
    steps: ["Ướp cá, kho lửa nhỏ đến khi nước sệt lại."],
  },
  {
    title: "Canh chua cá lóc",
    description: "Canh chua ngọt thanh đặc trưng miền Tây.",
    region: "Southern",
    tags: ["Soup", "Southern"],
    image:
      "https://media.vov.vn/sites/default/files/styles/large/public/2020-10/nau5.jpg",
    cookTime: 30,
    ingredients: [
      { name: "Cá lóc", amount: 150, unit: "g" },
      { name: "Cà chua", amount: 100, unit: "g" },
    ],
    steps: ["Nấu nước với thơm, cà chua, cho cá vào nấu chín, nêm vừa ăn."],
  },
  {
    title: "Thịt kho tàu",
    description: "Thịt ba rọi kho nước dừa, mềm béo, vị mặn ngọt hài hòa.",
    region: "Southern",
    tags: ["Stew", "RiceSide", "Southern"],
    image:
      "https://cdn.tgdd.vn/Files/2019/01/07/1143169/cach-nau-thit-kho-tau-trung-cut-thom-ngon-thit-mem-dam-da-202401091518527882.jpg",
    cookTime: 50,
    ingredients: [
      { name: "Thịt heo", amount: 200, unit: "g" },
      { name: "Đường", amount: 1, unit: "tbsp" },
      { name: "Nước mắm", amount: 2, unit: "tbsp" },
    ],
    steps: ["Kho thịt với nước dừa, trứng cút cho đến khi sệt nước."],
  },
  {
    title: "Mì Quảng",
    description: "Đặc sản Quảng Nam, sợi mì vàng, nước sệt đậm đà.",
    region: "Central",
    tags: ["RiceSide", "Central"],
    image:
      "https://www.huongnghiepaau.com/wp-content/uploads/2017/08/mi-quang-tom-thit.jpg",
    cookTime: 30,
    ingredients: [
      { name: "Thịt gà", amount: 150, unit: "g" },
      { name: "Tôm", amount: 50, unit: "g" },
    ],
    steps: ["Xào thịt, tôm, nêm nghệ, nấu sệt, ăn kèm bánh tráng và rau sống."],
  },
  {
    title: "Bún bò Huế",
    description: "Món đặc sản miền Trung, vị cay nồng, nước dùng đậm đà.",
    region: "Central",
    tags: ["Soup", "RiceSide", "Central"],
    image:
      "https://file.hstatic.net/200000700229/article/bun-bo-hue-1_da318989e7c2493f9e2c3e010e722466.jpg",
    cookTime: 45,
    ingredients: [
      { name: "Thịt bò", amount: 150, unit: "g" },
      { name: "Tỏi", amount: 10, unit: "g" },
    ],
    steps: ["Hầm xương bò, nêm mắm ruốc, thêm sả và ớt."],
  },
  {
    title: "Gỏi ngó sen tôm thịt",
    description: "Khai vị thanh mát, chua ngọt, ăn kèm bánh phồng tôm.",
    region: "Southern",
    tags: ["Salad", "Pickle", "Southern"],
    image:
      "https://cdn.tgdd.vn/Files/2020/06/13/1262734/cach-lam-goi-tai-heo-ngo-sen-chua-ngot-nham-nhi-cuoi-tuan-202006131454382396.jpg",
    cookTime: 20,
    ingredients: [
      { name: "Tôm", amount: 100, unit: "g" },
      { name: "Thịt heo", amount: 100, unit: "g" },
      { name: "Đậu phộng", amount: 20, unit: "g" },
    ],
    steps: ["Luộc tôm thịt, trộn với ngó sen và nước mắm chua ngọt."],
  },
  {
    title: "Chè đậu xanh nước cốt dừa",
    description: "Món tráng miệng ngọt, béo, dễ ăn.",
    region: "Southern",
    tags: ["Dessert", "Drinks", "Southern"],
    image:
      "https://cdn.tgdd.vn/Files/2021/10/19/1391557/cach-nau-che-dau-xanh-bot-bang-cot-dua-thom-ngon-dung-dieu-202110191133443073.jpg",
    cookTime: 25,
    ingredients: [
      { name: "Đường", amount: 2, unit: "tbsp" },
      { name: "Đậu hũ", amount: 100, unit: "g" },
    ],
    steps: ["Nấu đậu xanh với nước cốt dừa, thêm đường cho vừa vị."],
  },
];

async function main() {
  console.log("🌾 Seeding DailyCook AI database...");

  // Create ingredients
  const ingredientMap = new Map<string, string>();
  for (const i of ingredients) {
    const ing = await prisma.ingredient.create({ data: i });
    ingredientMap.set(i.name, ing.id);
  }

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@dailycook.vn" },
    update: {},
    create: {
      email: "demo@dailycook.vn",
      name: "Demo User",
      phone: "+84999999999",
      passwordHash: "demo",
      preference: {
        create: {
          gender: "male",
          age: 26,
          height: 172,
          weight: 67,
          goal: "maintain",
          activity: "medium",
          dailyKcalTarget: 2200,
        },
      },
    },
  });

  // Create recipes
  for (const r of recipes) {
    const items = r.ingredients.map((i) => ({
      ingredientId: ingredientMap.get(i.name)!,
      amount: i.amount,
      unitOverride: i.unit,
    }));

    // Calculate totalKcal
    let totalKcal = 0;
    for (const i of r.ingredients) {
      const ref = ingredients.find((x) => x.name === i.name);
      if (ref) totalKcal += (ref.kcal * i.amount) / 100;
    }

    await prisma.recipe.create({
      data: {
        authorId: user.id,
        title: r.title,
        description: r.description,
        region: r.region,
        cookTime: r.cookTime,
        likes: Math.floor(500 + Math.random() * 2000),
        totalKcal,
        tags: r.tags,
        image: r.image,
        steps: r.steps as Prisma.InputJsonValue,
        items: { create: items },
      },
    });
  }

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
