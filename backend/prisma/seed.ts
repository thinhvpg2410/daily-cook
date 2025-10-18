/* prisma/seed.ts */
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

type ItemSpec = { ingredient: string; amount: number; unitOverride?: string };

type RecipeSpec = {
  title: string;
  description: string;
  image?: string;
  cookTime?: number; // minutes
  likes?: number;
  tags: string[]; // ví dụ: ['Breakfast','Traditional']
  steps: string[];
  items: ItemSpec[];
};

// ===== 1) Thư viện nguyên liệu (chuẩn hoá unit/kcal cơ bản) =====
const ING: { name: string; unit?: string; kcal?: number }[] = [
  { name: "Thịt heo", unit: "g", kcal: 242 },
  { name: "Thịt bò", unit: "g", kcal: 250 },
  { name: "Thịt gà", unit: "g", kcal: 215 },
  { name: "Tôm", unit: "g", kcal: 105 },
  { name: "Cá basa", unit: "g", kcal: 120 },
  { name: "Cá thu", unit: "g", kcal: 166 },
  { name: "Cá hồi", unit: "g", kcal: 208 },
  { name: "Giò sống", unit: "g", kcal: 200 },
  { name: "Bún tươi", unit: "g", kcal: 110 },
  { name: "Bánh phở", unit: "g", kcal: 110 },
  { name: "Bánh tráng", unit: "cái", kcal: 35 },
  { name: "Bánh mì", unit: "ổ", kcal: 230 },
  { name: "Bún khô", unit: "g", kcal: 350 },
  { name: "Cơm trắng", unit: "chén", kcal: 200 },
  { name: "Gạo", unit: "g", kcal: 350 },
  { name: "Xôi nếp", unit: "chén", kcal: 300 },
  { name: "Bún bò viên", unit: "g", kcal: 230 },
  { name: "Trứng gà", unit: "cái", kcal: 70 },
  { name: "Đậu hũ", unit: "g", kcal: 76 },
  { name: "Rau thơm", unit: "nắm", kcal: 5 },
  { name: "Rau xà lách", unit: "lá", kcal: 2 },
  { name: "Giá đỗ", unit: "g", kcal: 31 },
  { name: "Cà chua", unit: "quả", kcal: 22 },
  { name: "Dứa (thơm)", unit: "g", kcal: 50 },
  { name: "Bạc hà (dọc mùng)", unit: "g", kcal: 15 },
  { name: "Hành lá", unit: "cây", kcal: 5 },
  { name: "Hành tím", unit: "củ", kcal: 5 },
  { name: "Tỏi", unit: "tép", kcal: 3 },
  { name: "Sả", unit: "cây", kcal: 7 },
  { name: "Gừng", unit: "lát", kcal: 2 },
  { name: "Ngò gai", unit: "nhánh", kcal: 2 },
  { name: "Ớt", unit: "trái", kcal: 5 },
  { name: "Nước mắm", unit: "muỗng", kcal: 10 },
  { name: "Nước tương", unit: "muỗng", kcal: 8 },
  { name: "Dầu ăn", unit: "muỗng", kcal: 120 },
  { name: "Đường", unit: "muỗng", kcal: 60 },
  { name: "Muối", unit: "muỗng", kcal: 0 },
  { name: "Tiêu", unit: "muỗng", kcal: 10 },
  { name: "Mắm tôm", unit: "muỗng", kcal: 20 },
  { name: "Bột ngọt", unit: "muỗng", kcal: 0 },
  { name: "Bột canh", unit: "muỗng", kcal: 0 },
  { name: "Bột chiên xù", unit: "g", kcal: 400 },
  { name: "Bột năng", unit: "g", kcal: 350 },
  { name: "Bột gạo", unit: "g", kcal: 360 },
  { name: "Dầu hào", unit: "muỗng", kcal: 9 },
  { name: "Sa tế", unit: "muỗng", kcal: 15 },
  { name: "Sữa đặc", unit: "muỗng", kcal: 60 },
  { name: "Sữa tươi", unit: "ml", kcal: 60 },
  { name: "Dừa nạo", unit: "g", kcal: 354 },
  { name: "Nước cốt dừa", unit: "ml", kcal: 230 },
  { name: "Lạc (đậu phộng)", unit: "g", kcal: 567 },
  { name: "Mè (vừng)", unit: "g", kcal: 573 },
  { name: "Bắp cải", unit: "g", kcal: 25 },
  { name: "Cải thìa", unit: "g", kcal: 13 },
  { name: "Cải chíp", unit: "g", kcal: 13 },
  { name: "Rau muống", unit: "g", kcal: 19 },
  { name: "Khoai tây", unit: "củ", kcal: 80 },
  { name: "Khoai lang", unit: "củ", kcal: 90 },
  { name: "Cà rốt", unit: "củ", kcal: 41 },
  { name: "Măng tươi", unit: "g", kcal: 27 },
  { name: "Nấm rơm", unit: "g", kcal: 22 },
  { name: "Nấm đông cô", unit: "g", kcal: 34 },
  { name: "Bột cà ri", unit: "muỗng", kcal: 20 },
  { name: "Quế, hồi", unit: "g", kcal: 10 },
  { name: "Bánh hỏi", unit: "g", kcal: 320 },
  { name: "Dưa leo", unit: "quả", kcal: 12 },
  { name: "Chanh", unit: "quả", kcal: 16 },
];

// ===== 2) Bộ ảnh mặc định theo tên món (nếu khớp) =====
const IMG: Record<string, string> = {
  "Phở bò":
    "https://cdn.tgdd.vn/Files/2020/03/26/1244909/cach-nau-pho-bo-tai-nha-dam-da-huong-vi-truyen-thong-202303161700027470.jpg",
  "Bún chả Hà Nội":
    "https://cdn.tgdd.vn/Files/2019/03/01/1150584/cach-lam-bun-cha-ha-noi-chuan-vi-truyen-thong-202112081531260450.jpg",
  "Cơm tấm sườn bì chả":
    "https://cdn.tgdd.vn/Files/2021/06/08/1361874/cach-lam-com-tam-suon-bi-cha-dam-da-huong-vi-truyen-thong-202106081450058890.jpg",
  "Gỏi cuốn tôm thịt":
    "https://cdn.tgdd.vn/Files/2020/04/28/1250931/cach-lam-goi-cuon-tom-thit-thom-ngon-chuan-vi-nha-hang-202004281126351913.jpg",
  "Canh chua cá basa":
    "https://cdn.tgdd.vn/Files/2018/11/22/1130903/cach-nau-canh-chua-ca-basa-dam-da-huong-vi-nam-bo-202109101424007886.jpg",
  "Bánh mì thịt": "https://i.imgur.com/2Qp3o7p.jpg",
  "Bún bò Huế": "https://i.imgur.com/0m1oQ7s.jpg",
  "Hủ tiếu Nam Vang": "https://i.imgur.com/7Yp3x8E.jpg",
  "Chả giò rán": "https://i.imgur.com/E1m5pQy.jpg",
  "Lẩu thái chua cay": "https://i.imgur.com/8S5PjzB.jpg",
  "Gà kho gừng": "https://i.imgur.com/0l5xq2C.jpg",
  "Cá kho tộ": "https://i.imgur.com/7lK0Hny.jpg",
  "Xôi gấc": "https://i.imgur.com/Cx8a6sW.jpg",
  "Chè đậu xanh": "https://i.imgur.com/2qR6uW2.jpg",
  "Trà sữa trân châu": "https://i.imgur.com/7bJ2o4W.jpg",
  "Sinh tố bơ": "https://i.imgur.com/Cj1Cqzq.jpg",
  "Bánh flan": "https://i.imgur.com/b2vS1Jg.jpg",
  "Cà phê sữa đá": "https://i.imgur.com/8h2xw2M.jpg",
  "Cơm chiên Dương Châu": "https://i.imgur.com/3s8a9eN.jpg",
};

// ===== 3) 30 món Việt “chuẩn” có cấu trúc đầy đủ =====
const BASE_RECIPES: RecipeSpec[] = [
  {
    title: "Phở bò",
    description:
      "Nước dùng trong, thơm quế hồi; bánh phở mềm, thịt bò tái chín tới.",
    image: IMG["Phở bò"],
    cookTime: 45,
    likes: 520,
    tags: ["Breakfast", "Traditional"],
    steps: [
      "Hầm xương bò 2–3 giờ với quế, hồi, gừng nướng.",
      "Nêm muối, đường phèn, nước mắm vừa ăn.",
      "Chần bánh phở, thịt bò thái mỏng.",
      "Chan nước dùng, rắc hành lá, tiêu.",
    ],
    items: [
      { ingredient: "Thịt bò", amount: 200 },
      { ingredient: "Bánh phở", amount: 200 },
      { ingredient: "Hành lá", amount: 2 },
      { ingredient: "Quế, hồi", amount: 5, unitOverride: "g" },
      { ingredient: "Muối", amount: 0.5 },
      { ingredient: "Nước mắm", amount: 1 },
    ],
  },
  {
    title: "Bún chả Hà Nội",
    description: "Chả nướng thơm, nước mắm chua ngọt, ăn kèm bún và rau sống.",
    image: IMG["Bún chả Hà Nội"],
    cookTime: 40,
    likes: 430,
    tags: ["Lunch", "Grilled", "Northern"],
    steps: [
      "Ướp thịt heo băm + ba chỉ với nước mắm, đường, tỏi.",
      "Nướng than đến khi vàng xém cạnh.",
      "Pha nước mắm chua ngọt, chuẩn bị bún, rau sống.",
      "Ăn kèm và thưởng thức.",
    ],
    items: [
      { ingredient: "Thịt heo", amount: 250 },
      { ingredient: "Bún tươi", amount: 200 },
      { ingredient: "Tỏi", amount: 3 },
      { ingredient: "Nước mắm", amount: 2 },
      { ingredient: "Đường", amount: 1 },
      { ingredient: "Rau thơm", amount: 1 },
    ],
  },
  {
    title: "Cơm tấm sườn bì chả",
    description: "Đặc sản Sài Gòn: sườn nướng, bì, chả trứng ăn kèm cơm tấm.",
    image: IMG["Cơm tấm sườn bì chả"],
    cookTime: 35,
    likes: 380,
    tags: ["Lunch", "Southern"],
    steps: [
      "Ướp sườn với mật ong, nước mắm, tỏi rồi nướng.",
      "Đánh trứng làm chả hấp.",
      "Luộc bì heo, thái nhỏ.",
      "Dọn cơm tấm, rưới mỡ hành, nước mắm chua ngọt.",
    ],
    items: [
      { ingredient: "Thịt heo", amount: 280 },
      { ingredient: "Trứng gà", amount: 2, unitOverride: "cái" },
      { ingredient: "Cơm trắng", amount: 1, unitOverride: "chén" },
      { ingredient: "Nước mắm", amount: 2 },
      { ingredient: "Hành lá", amount: 2 },
    ],
  },
  {
    title: "Gỏi cuốn tôm thịt",
    description:
      "Cuốn bánh tráng với tôm, thịt, rau và bún; chấm nước mắm hoặc tương.",
    image: IMG["Gỏi cuốn tôm thịt"],
    cookTime: 20,
    likes: 300,
    tags: ["Dinner", "Healthy"],
    steps: [
      "Luộc tôm, thịt; cắt lát.",
      "Chuẩn bị bún, rau, bánh tráng.",
      "Cuốn chặt tay, bày ra đĩa.",
      "Pha nước chấm (nước mắm hoặc tương).",
    ],
    items: [
      { ingredient: "Tôm", amount: 120 },
      { ingredient: "Thịt heo", amount: 120 },
      { ingredient: "Bánh tráng", amount: 8, unitOverride: "cái" },
      { ingredient: "Bún tươi", amount: 150 },
      { ingredient: "Rau thơm", amount: 1 },
    ],
  },
  {
    title: "Canh chua cá basa",
    description: "Chua thanh vị dứa, cà chua; cá mềm ngọt, ăn kèm cơm nóng.",
    image: IMG["Canh chua cá basa"],
    cookTime: 25,
    likes: 270,
    tags: ["Dinner", "Soup", "Southern"],
    steps: [
      "Xào dứa, cà chua cho dậy mùi.",
      "Đổ nước, cho cá vào nấu chín.",
      "Nêm nếm, thêm bạc hà, giá.",
      "Rắc rau thơm, tắt bếp.",
    ],
    items: [
      { ingredient: "Cá basa", amount: 220 },
      { ingredient: "Dứa (thơm)", amount: 150 },
      { ingredient: "Cà chua", amount: 2, unitOverride: "quả" },
      { ingredient: "Bạc hà (dọc mùng)", amount: 120 },
      { ingredient: "Rau thơm", amount: 1 },
    ],
  },
  // … thêm nhanh danh sách món Việt tiêu biểu:
  {
    title: "Bánh mì thịt",
    description: "Bánh mì Việt Nam kẹp thịt, đồ chua, pate.",
    image: IMG["Bánh mì thịt"],
    cookTime: 10,
    likes: 500,
    tags: ["Breakfast", "StreetFood"],
    steps: [
      "Chuẩn bị nhân thịt và pate.",
      "Nướng nóng ổ bánh mì.",
      "Kẹp đồ chua, rau.",
      "Chan nước sốt vừa ăn.",
    ],
    items: [
      { ingredient: "Bánh mì", amount: 1, unitOverride: "ổ" },
      {
        ingredient: "Thịt heo",
        amount: 80,
      },
      { ingredient: "Rau thơm", amount: 1 },
    ],
  },
  {
    title: "Bún bò Huế",
    description: "Đậm đà, cay nồng; chả cua, giò heo, sả.",
    image: IMG["Bún bò Huế"],
    cookTime: 50,
    likes: 410,
    tags: ["Lunch", "Central"],
    steps: [
      "Hầm xương, thêm sả.",
      "Nêm mắm ruốc vừa ăn.",
      "Chần bún, thêm thịt, chả.",
      "Chan nước dùng.",
    ],
    items: [
      { ingredient: "Thịt bò", amount: 200 },
      { ingredient: "Bún tươi", amount: 200 },
      {
        ingredient: "Sả",
        amount: 2,
      },
      { ingredient: "Hành lá", amount: 2 },
    ],
  },
  {
    title: "Hủ tiếu Nam Vang",
    description: "Nước dùng thanh, topping tôm thịt, trứng cút.",
    image: IMG["Hủ tiếu Nam Vang"],
    cookTime: 40,
    likes: 320,
    tags: ["Breakfast", "Southern"],
    steps: [
      "Hầm xương heo.",
      "Sơ chế tôm, thịt.",
      "Luộc hủ tiếu.",
      "Sắp topping, chan nước.",
    ],
    items: [
      { ingredient: "Thịt heo", amount: 200 },
      { ingredient: "Tôm", amount: 100 },
      {
        ingredient: "Bún khô",
        amount: 150,
      },
      { ingredient: "Hành lá", amount: 2 },
    ],
  },
  {
    title: "Chả giò rán",
    description: "Nem rán giòn, nhân thịt mộc nhĩ, miến.",
    image: IMG["Chả giò rán"],
    cookTime: 30,
    likes: 360,
    tags: ["Dinner", "Fried"],
    steps: [
      "Trộn nhân thịt, miến.",
      "Cuốn với bánh tráng.",
      "Chiên ngập dầu.",
      "Ăn kèm rau, nước chấm.",
    ],
    items: [
      { ingredient: "Thịt heo", amount: 200 },
      { ingredient: "Bánh tráng", amount: 10 },
      {
        ingredient: "Dầu ăn",
        amount: 3,
        unitOverride: "muỗng",
      },
      { ingredient: "Tỏi", amount: 2 },
    ],
  },
  {
    title: "Lẩu thái chua cay",
    description: "Đậm vị sả ớt, hải sản, nấm.",
    image: IMG["Lẩu thái chua cay"],
    cookTime: 60,
    likes: 280,
    tags: ["Dinner", "Hotpot"],
    steps: [
      "Nấu nước lẩu với sả ớt.",
      "Nêm sa tế, bột cà ri.",
      "Thả nấm, hải sản.",
      "Ăn kèm rau, bún.",
    ],
    items: [
      { ingredient: "Tôm", amount: 150 },
      { ingredient: "Cá thu", amount: 200 },
      {
        ingredient: "Nấm rơm",
        amount: 150,
      },
      { ingredient: "Sa tế", amount: 1 },
    ],
  },
  {
    title: "Gà kho gừng",
    description: "Thịt gà thấm vị, thơm gừng, ăn hao cơm.",
    image: IMG["Gà kho gừng"],
    cookTime: 35,
    likes: 250,
    tags: ["Dinner", "RiceSide"],
    steps: [
      "Ướp gà với nước mắm, gừng.",
      "Kho lửa vừa đến sệt.",
      "Nêm nếm lại.",
      "Rắc tiêu, hành lá.",
    ],
    items: [
      { ingredient: "Thịt gà", amount: 300 },
      {
        ingredient: "Gừng",
        amount: 4,
        unitOverride: "lát",
      },
      { ingredient: "Nước mắm", amount: 2 },
      { ingredient: "Đường", amount: 1 },
    ],
  },
  {
    title: "Cá kho tộ",
    description: "Cá thấm nước màu, béo nhẹ; ăn cùng cơm trắng.",
    image: IMG["Cá kho tộ"],
    cookTime: 40,
    likes: 270,
    tags: ["Dinner", "RiceSide", "Southern"],
    steps: [
      "Ướp cá với nước mắm, đường.",
      "Thắng nước màu.",
      "Kho lửa nhỏ đến sánh.",
      "Thêm tiêu, ớt.",
    ],
    items: [
      { ingredient: "Cá basa", amount: 280 },
      { ingredient: "Nước mắm", amount: 2 },
      {
        ingredient: "Đường",
        amount: 1,
      },
      { ingredient: "Tiêu", amount: 0.3 },
    ],
  },
  {
    title: "Xôi gấc",
    description: "Xôi đỏ mềm dẻo, thơm béo.",
    image: IMG["Xôi gấc"],
    cookTime: 50,
    likes: 190,
    tags: ["Breakfast", "Dessert"],
    steps: [
      "Ngâm nếp.",
      "Trộn gấc, hấp chín.",
      "Trộn nước cốt dừa.",
      "Rắc mè, đậu phộng.",
    ],
    items: [
      { ingredient: "Xôi nếp", amount: 1, unitOverride: "chén" },
      {
        ingredient: "Nước cốt dừa",
        amount: 60,
        unitOverride: "ml",
      },
      { ingredient: "Mè (vừng)", amount: 10, unitOverride: "g" },
    ],
  },
  {
    title: "Chè đậu xanh",
    description: "Chè ngọt thanh, thêm nước cốt dừa.",
    image: IMG["Chè đậu xanh"],
    cookTime: 30,
    likes: 180,
    tags: ["Dessert"],
    steps: [
      "Nấu đậu xanh mềm.",
      "Thêm đường vừa ngọt.",
      "Chan nước cốt dừa.",
      "Dùng lạnh hoặc nóng.",
    ],
    items: [
      { ingredient: "Đường", amount: 2 },
      { ingredient: "Nước cốt dừa", amount: 80, unitOverride: "ml" },
    ],
  },
  {
    title: "Trà sữa trân châu",
    description: "Trà đen pha sữa, topping trân châu.",
    image: IMG["Trà sữa trân châu"],
    cookTime: 20,
    likes: 500,
    tags: ["Drinks"],
    steps: [
      "Nấu trà đen.",
      "Thêm sữa tươi + sữa đặc.",
      "Luộc trân châu.",
      "Thêm đá.",
    ],
    items: [
      { ingredient: "Sữa tươi", amount: 200, unitOverride: "ml" },
      {
        ingredient: "Sữa đặc",
        amount: 2,
        unitOverride: "muỗng",
      },
      { ingredient: "Đường", amount: 1 },
    ],
  },
  {
    title: "Sinh tố bơ",
    description: "Sinh tố béo mịn, thơm bơ.",
    image: IMG["Sinh tố bơ"],
    cookTime: 10,
    likes: 260,
    tags: ["Drinks"],
    steps: [
      "Tách thịt bơ.",
      "Xay với sữa, đá.",
      "Nêm sữa đặc.",
      "Rót ly, thưởng thức.",
    ],
    items: [
      { ingredient: "Sữa tươi", amount: 120, unitOverride: "ml" },
      { ingredient: "Sữa đặc", amount: 1 },
    ],
  },
  {
    title: "Bánh flan",
    description: "Mịn mượt, thơm trứng sữa, caramel.",
    image: IMG["Bánh flan"],
    cookTime: 40,
    likes: 300,
    tags: ["Dessert"],
    steps: ["Nấu caramel.", "Pha trứng sữa.", "Lọc mịn.", "Hấp lửa nhỏ."],
    items: [
      { ingredient: "Trứng gà", amount: 3 },
      {
        ingredient: "Sữa tươi",
        amount: 200,
        unitOverride: "ml",
      },
      { ingredient: "Đường", amount: 2 },
    ],
  },
  {
    title: "Cà phê sữa đá",
    description: "Đậm đà cà phê Việt, sữa đặc.",
    image: IMG["Cà phê sữa đá"],
    cookTime: 5,
    likes: 1000,
    tags: ["Drinks", "Breakfast"],
    steps: [
      "Pha phin cà phê.",
      "Thêm sữa đặc.",
      "Khuấy đều với đá.",
      "Uống liền.",
    ],
    items: [{ ingredient: "Sữa đặc", amount: 1 }],
  },
  {
    title: "Cơm chiên Dương Châu",
    description: "Cơm chiên hạt rời, nhiều topping.",
    image: IMG["Cơm chiên Dương Châu"],
    cookTime: 25,
    likes: 340,
    tags: ["Lunch", "StirFry"],
    steps: [
      "Xào trứng.",
      "Thêm cơm nguội, nêm nếm.",
      "Cho tôm, đậu.",
      "Đảo đều.",
    ],
    items: [
      { ingredient: "Cơm trắng", amount: 1, unitOverride: "chén" },
      {
        ingredient: "Tôm",
        amount: 120,
      },
      { ingredient: "Trứng gà", amount: 1 },
    ],
  },
  // Bạn có thể bổ sung thêm các món: Mì Quảng, Bánh xèo, Bún riêu, Nem nướng Nha Trang,
  // Bánh canh cua, Cá hấp hành, Thịt kho tàu, Sườn xào chua ngọt, Bò kho, Bánh hỏi heo quay, v.v.
];

// ===== 4) Generator: Tạo thêm ~70 món từ template để đủ ~100 =====
const NAME_TEMPLATES: Array<[string, string[]]> = [
  ["Bánh xèo", ["Lunch", "StreetFood", "Southern"]],
  ["Bún riêu", ["Lunch", "Soup"]],
  ["Mì Quảng", ["Lunch", "Central"]],
  ["Bánh canh cua", ["Lunch", "Soup"]],
  ["Bò kho", ["Dinner", "Stew"]],
  ["Sườn xào chua ngọt", ["Dinner", "RiceSide"]],
  ["Thịt kho tàu", ["Dinner", "RiceSide", "Southern"]],
  ["Cá hấp hành", ["Dinner", "Healthy"]],
  ["Gỏi bò bóp thấu", ["Dinner", "Salad"]],
  ["Bánh hỏi heo quay", ["Breakfast", "StreetFood"]],
  ["Bún thịt nướng", ["Lunch", "Grilled"]],
  ["Bún mắm", ["Lunch", "Southern", "Soup"]],
  ["Cơm gà Hội An", ["Lunch", "Central"]],
  ["Bánh cuốn nóng", ["Breakfast", "Northern"]],
  ["Bánh bèo chén", ["Snack", "Central"]],
  ["Bánh bột lọc", ["Snack", "Central"]],
  ["Bánh khọt", ["Snack", "Southern"]],
  ["Chè ba màu", ["Dessert", "Southern"]],
  ["Sâm bổ lượng", ["Dessert", "Drinks"]],
  ["Rau muống xào tỏi", ["Dinner", "Veggie"]],
  ["Đậu hũ sốt cà", ["Dinner", "Veggie"]],
  ["Canh bí đỏ tôm", ["Dinner", "Soup"]],
  ["Canh rau ngót thịt băm", ["Dinner", "Soup"]],
  ["Lẩu bò", ["Dinner", "Hotpot"]],
  ["Lẩu mắm", ["Dinner", "Hotpot", "Southern"]],
  ["Gà nướng sả", ["Lunch", "Grilled"]],
  ["Cá nướng giấy bạc", ["Dinner", "Grilled"]],
  ["Bắp xào tép", ["Snack", "StreetFood"]],
  ["Khoai lang nướng", ["Snack", "StreetFood"]],
  ["Xôi mặn", ["Breakfast"]],
];

function fallbackImage(title: string, i: number) {
  // nếu có ảnh preset thì dùng, không thì dùng Unsplash với seed ổn định
  return (
    IMG[title] ||
    `https://source.unsplash.com/600x400/?vietnamese,food&sig=${encodeURIComponent(title)}_${i}`
  );
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// tạo steps “đủ ý” ngắn gọn
function buildSteps(core: string[]): string[] {
  const common = [
    "Sơ chế nguyên liệu sạch.",
    "Nêm nếm vừa ăn.",
    "Trình bày ra đĩa/ tô, rắc hành ngò.",
  ];
  return [...core, ...common].slice(0, 4);
}

function buildItems(kind: string): ItemSpec[] {
  // kind ảnh hưởng đến nguyên liệu chính
  switch (kind) {
    case "Soup":
      return [
        { ingredient: "Thịt heo", amount: 150 },
        { ingredient: "Hành lá", amount: 2 },
        { ingredient: "Muối", amount: 0.5 },
      ];
    case "Grilled":
      return [
        { ingredient: "Thịt heo", amount: 200 },
        { ingredient: "Tỏi", amount: 3 },
        { ingredient: "Nước mắm", amount: 1 },
      ];
    case "Veggie":
      return [
        { ingredient: "Đậu hũ", amount: 200 },
        { ingredient: "Cà chua", amount: 1, unitOverride: "quả" },
        { ingredient: "Hành tím", amount: 1 },
      ];
    case "Hotpot":
      return [
        { ingredient: "Thịt bò", amount: 220 },
        { ingredient: "Nấm rơm", amount: 150 },
        { ingredient: "Rau thơm", amount: 1 },
      ];
    case "StreetFood":
      return [
        { ingredient: "Bánh tráng", amount: 6, unitOverride: "cái" },
        { ingredient: "Thịt heo", amount: 150 },
        { ingredient: "Rau thơm", amount: 1 },
      ];
    default:
      return [
        { ingredient: "Thịt gà", amount: 200 },
        { ingredient: "Hành lá", amount: 2 },
        { ingredient: "Nước mắm", amount: 1 },
      ];
  }
}

function generateMoreRecipes(targetCount = 100): RecipeSpec[] {
  const list: RecipeSpec[] = [...BASE_RECIPES];
  let i = 0;
  while (list.length < targetCount) {
    const [name, tags] = NAME_TEMPLATES[i % NAME_TEMPLATES.length];
    const primaryKind =
      tags.find((t) =>
        ["Soup", "Grilled", "Veggie", "Hotpot", "StreetFood"].includes(t),
      ) || "Dinner";
    list.push({
      title:
        name +
        (list.filter((r) => r.title === name).length
          ? ` ${list.filter((r) => r.title.startsWith(name)).length + 1}`
          : ""),
      description: `${name} phiên bản seed tự động, vị vừa ăn, hợp khẩu vị Việt.`,
      image: fallbackImage(name, list.length),
      cookTime: randomInt(15, 60),
      likes: randomInt(50, 600),
      tags,
      steps: buildSteps([
        primaryKind === "Grilled"
          ? "Ướp gia vị tối thiểu 20 phút."
          : primaryKind === "Soup"
            ? "Nấu nước dùng với xương/rau củ nền."
            : primaryKind === "Veggie"
              ? "Xào lửa lớn giữ độ giòn rau."
              : primaryKind === "Hotpot"
                ? "Pha nước lẩu đậm đà."
                : "Sơ chế và cắt thái nguyên liệu chính.",
      ]),
      items: buildItems(primaryKind),
    });
    i++;
  }
  return list;
}

// ===== 5) Shopping list builder: gom từ danh sách recipe Ids =====
async function buildShoppingListFromRecipes(
  userId: string,
  recipeIds: string[],
  title = "Danh sách mua sắm tuần 1",
) {
  // lấy tất cả items kèm ingredient
  const recs = await prisma.recipe.findMany({
    where: { id: { in: recipeIds } },
    include: { items: { include: { ingredient: true } } },
  });

  // gom theo ingredient.name
  const map = new Map<
    string,
    { ingredientId: string; name: string; unit?: string; qty: number }
  >();
  for (const r of recs) {
    for (const it of r.items) {
      const key = it.ingredient.name;
      const prev = map.get(key);
      const qty = it.amount;
      if (prev) {
        prev.qty += qty;
      } else {
        map.set(key, {
          ingredientId: it.ingredient.id,
          name: it.ingredient.name,
          unit: it.unitOverride || it.ingredient.unit || undefined,
          qty,
        });
      }
    }
  }

  const items = Array.from(map.values()).map((x) => ({
    ingredientId: x.ingredientId,
    name: x.name,
    qty: x.qty,
    unit: x.unit,
    checked: false,
  }));

  return prisma.shoppingList.create({
    data: { userId, title, items },
  });
}

async function main() {
  console.log("🌱 Seeding ingredients...");
  // upsert ingredient theo name (do name @unique)
  for (const ing of ING) {
    await prisma.ingredient.upsert({
      where: { name: ing.name },
      update: { unit: ing.unit, kcal: ing.kcal },
      create: { name: ing.name, unit: ing.unit, kcal: ing.kcal },
    });
  }

  // đảm bảo có admin để làm author
  let admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: "admin@dailycook.local",
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=1$ZHVtbXk$dummyhash", // demo
        name: "Administrator",
        role: Role.ADMIN,
        phone: "0900000000",
      },
    });
  }

  console.log("🍳 Building recipes...");
  const RECIPES = generateMoreRecipes(100);

  console.log("🍽  Inserting recipes...");
  const createdIds: string[] = [];
  for (const r of RECIPES) {
    const created = await prisma.recipe.create({
      data: {
        authorId: admin.id,
        title: r.title,
        description: r.description,
        image: r.image,
        cookTime: r.cookTime ?? 30,
        likes: r.likes ?? 0,
        tags: r.tags,
        steps: r.steps,
        items: {
          create: r.items.map((i) => ({
            amount: i.amount,
            unitOverride: i.unitOverride,
            ingredient: { connect: { name: i.ingredient } }, // 👈 connect by name
          })),
        },
      },
      select: { id: true },
    });
    createdIds.push(created.id);
  }

  console.log(
    "🛒 Building shopping list from first 9 recipes (3 bữa x 3 ngày)...",
  );
  // ví dụ meal plan 3 ngày * 3 bữa = 9 món đầu tiên
  const subset = createdIds.slice(0, 9);
  await buildShoppingListFromRecipes(admin.id, subset, "Shopping tuần 1 (mẫu)");

  console.log("✅ Seed done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
