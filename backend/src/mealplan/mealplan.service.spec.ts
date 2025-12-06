import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { MealPlanService } from "./mealplan.service";
import { PrismaService } from "../prisma/prisma.service";
import { AIService } from "../ai/ai.service";
import { CreateMealPlanDto } from "./dto/create-mealplan.dto";
import { UpdateMealPlanDto } from "./dto/update-mealplan.dto";
import { SuggestMenuDto } from "./dto/suggest-menu.dto";
import { PatchSlotDto } from "./dto/patch-slot.dto";

describe("MealPlanService", () => {
  let service: MealPlanService;
  let prisma: PrismaService;
  let aiService: AIService;

  const mockPrisma = {
    userPreference: {
      findUnique: jest.fn(),
    },
    mealPlan: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    recipe: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    ingredient: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    aIRecommendationLog: {
      create: jest.fn(),
    },
  };

  const mockAIService = {
    isEnabled: jest.fn(),
    fetchIngredientMarketPrices: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealPlanService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AIService, useValue: mockAIService },
      ],
    }).compile();

    service = module.get<MealPlanService>(MealPlanService);
    prisma = module.get<PrismaService>(PrismaService);
    aiService = module.get<AIService>(AIService);

    jest.clearAllMocks();
  });

  describe("suggestMeal", () => {
    it("should suggest meals based on preferences", async () => {
      const userId = "user-123";
      const region = "Northern";
      const dietType = "normal";
      const targetKcal = 2000;

      const mockPreferences = {
        dailyKcalTarget: 2000,
        likedTags: ["Northern"],
        dietType: "normal",
      };

      const mockRecipes = [
        {
          id: "recipe-1",
          title: "Phở Bò",
          totalKcal: 500,
          tags: ["Northern"],
        },
        {
          id: "recipe-2",
          title: "Bún Chả",
          totalKcal: 600,
          tags: ["Northern"],
        },
      ];

      mockPrisma.userPreference.findUnique.mockResolvedValue(mockPreferences);
      mockPrisma.recipe.findMany.mockResolvedValue(mockRecipes);

      const result = await service.suggestMeal(userId, region, dietType, targetKcal);

      expect(result).toHaveProperty("recipes");
      expect(result).toHaveProperty("totalKcal");
      expect(result).toHaveProperty("targetKcal", targetKcal);
    });

    it("should return empty recipes if no matches found", async () => {
      const userId = "user-123";

      const mockPreferences = {
        dailyKcalTarget: 2000,
        likedTags: [],
        dietType: "normal",
      };

      mockPrisma.userPreference.findUnique.mockResolvedValue(mockPreferences);
      mockPrisma.recipe.findMany.mockResolvedValue([]);

      const result = await service.suggestMeal(userId);

      expect(result.recipes).toHaveLength(0);
      expect(result).toHaveProperty("message");
    });
  });

  describe("getRange", () => {
    it("should return meal plans in date range", async () => {
      const userId = "user-123";
      const query = {
        start: "2024-01-01",
        end: "2024-01-07",
      };

      const mockMealPlans = [
        {
          id: "plan-1",
          userId,
          date: new Date("2024-01-01"),
          slots: { breakfast: ["recipe-1"], lunch: [], dinner: [] },
          note: null,
        },
        {
          id: "plan-2",
          userId,
          date: new Date("2024-01-02"),
          slots: { breakfast: [], lunch: ["recipe-2"], dinner: [] },
          note: null,
        },
      ];

      mockPrisma.mealPlan.findMany.mockResolvedValue(mockMealPlans);

      const result = await service.getRange(userId, query);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("date");
      expect(result[0]).toHaveProperty("slots");
    });
  });

  describe("getDailyNutrition", () => {
    it("should return daily nutrition from meal plan", async () => {
      const userId = "user-123";
      const dateStr = "2024-01-15";

      const mockMealPlan = {
        id: "plan-1",
        userId,
        date: new Date(dateStr),
        slots: {
          breakfast: ["recipe-1"],
          lunch: ["recipe-2"],
          dinner: ["recipe-3"],
        },
      };

      const mockRecipes = [
        {
          id: "recipe-1",
          title: "Breakfast",
          totalKcal: 400,
          protein: 20,
          fat: 10,
          carbs: 50,
          image: null,
        },
        {
          id: "recipe-2",
          title: "Lunch",
          totalKcal: 600,
          protein: 30,
          fat: 15,
          carbs: 70,
          image: null,
        },
        {
          id: "recipe-3",
          title: "Dinner",
          totalKcal: 500,
          protein: 25,
          fat: 12,
          carbs: 60,
          image: null,
        },
      ];

      mockPrisma.mealPlan.findUnique.mockResolvedValue(mockMealPlan);
      mockPrisma.recipe.findMany.mockResolvedValue(mockRecipes);

      const result = await service.getDailyNutrition(userId, dateStr);

      expect(result).toHaveProperty("date", dateStr);
      expect(result).toHaveProperty("hasPlan", true);
      expect(result).toHaveProperty("meals");
      expect(result).toHaveProperty("totals");
      expect(result.totals.calories).toBe(1500); // 400 + 600 + 500
    });

    it("should return empty plan if no meal plan exists", async () => {
      const userId = "user-123";
      const dateStr = "2024-01-15";

      mockPrisma.mealPlan.findUnique.mockResolvedValue(null);

      const result = await service.getDailyNutrition(userId, dateStr);

      expect(result).toHaveProperty("hasPlan", false);
      expect(result.totals.calories).toBe(0);
    });
  });

  describe("upsert", () => {
    it("should create new meal plan", async () => {
      const userId = "user-123";
      const dto: CreateMealPlanDto = {
        date: "2024-01-15",
        slots: {
          breakfast: ["recipe-1"],
          lunch: ["recipe-2"],
          dinner: ["recipe-3"],
        },
        note: "Test plan",
      };

      mockPrisma.mealPlan.findFirst.mockResolvedValue(null);
      mockPrisma.recipe.count.mockResolvedValue(3);
      mockPrisma.mealPlan.create.mockResolvedValue({
        id: "plan-1",
        userId,
        ...dto,
      });

      const result = await service.upsert(userId, dto);

      expect(mockPrisma.mealPlan.create).toHaveBeenCalled();
      expect(result).toHaveProperty("id");
    });

    it("should update existing meal plan", async () => {
      const userId = "user-123";
      const dto: CreateMealPlanDto = {
        date: "2024-01-15",
        slots: {
          breakfast: ["recipe-1"],
          lunch: [],
          dinner: [],
        },
      };

      const existingPlan = {
        id: "plan-1",
        userId,
        date: new Date(dto.date),
        slots: { breakfast: [], lunch: [], dinner: [] },
        note: null,
      };

      mockPrisma.mealPlan.findFirst.mockResolvedValue(existingPlan);
      mockPrisma.recipe.count.mockResolvedValue(1);
      mockPrisma.mealPlan.update.mockResolvedValue({
        ...existingPlan,
        slots: dto.slots,
      });

      const result = await service.upsert(userId, dto);

      expect(mockPrisma.mealPlan.update).toHaveBeenCalled();
      expect(result).toHaveProperty("id", "plan-1");
    });

    it("should throw BadRequestException if recipe does not exist", async () => {
      const userId = "user-123";
      const dto: CreateMealPlanDto = {
        date: "2024-01-15",
        slots: {
          breakfast: ["non-existent"],
          lunch: [],
          dinner: [],
        },
      };

      mockPrisma.mealPlan.findFirst.mockResolvedValue(null);
      mockPrisma.recipe.count.mockResolvedValue(0);

      await expect(service.upsert(userId, dto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("findOne", () => {
    it("should return meal plan by id", async () => {
      const userId = "user-123";
      const id = "plan-1";

      const mockPlan = {
        id,
        userId,
        date: new Date("2024-01-15"),
        slots: { breakfast: [], lunch: [], dinner: [] },
        note: null,
      };

      mockPrisma.mealPlan.findFirst.mockResolvedValue(mockPlan);

      const result = await service.findOne(userId, id);

      expect(result).toEqual(mockPlan);
    });

    it("should throw NotFoundException if meal plan not found", async () => {
      const userId = "user-123";
      const id = "non-existent";

      mockPrisma.mealPlan.findFirst.mockResolvedValue(null);

      await expect(service.findOne(userId, id)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("update", () => {
    it("should update meal plan", async () => {
      const userId = "user-123";
      const id = "plan-1";
      const dto: UpdateMealPlanDto = {
        note: "Updated note",
      };

      const existingPlan = {
        id,
        userId,
        date: new Date("2024-01-15"),
        slots: { breakfast: [], lunch: [], dinner: [] },
        note: null,
      };

      mockPrisma.mealPlan.findFirst.mockResolvedValue(existingPlan);
      mockPrisma.mealPlan.update.mockResolvedValue({
        ...existingPlan,
        note: dto.note,
      });

      const result = await service.update(userId, id, dto);

      expect(result.note).toBe(dto.note);
    });
  });

  describe("remove", () => {
    it("should delete meal plan", async () => {
      const userId = "user-123";
      const id = "plan-1";

      const existingPlan = {
        id,
        userId,
        date: new Date("2024-01-15"),
        slots: { breakfast: [], lunch: [], dinner: [] },
        note: null,
      };

      mockPrisma.mealPlan.findFirst.mockResolvedValue(existingPlan);
      mockPrisma.mealPlan.delete.mockResolvedValue(existingPlan);

      const result = await service.remove(userId, id);

      expect(mockPrisma.mealPlan.delete).toHaveBeenCalledWith({
        where: { id },
      });
      expect(result).toEqual({ deleted: true });
    });
  });

  describe("patchSlot", () => {
    it("should set slot recipes", async () => {
      const userId = "user-123";
      const id = "plan-1";
      const dto: PatchSlotDto = {
        slot: "breakfast",
        set: ["recipe-1", "recipe-2"],
      };

      const existingPlan = {
        id,
        userId,
        date: new Date("2024-01-15"),
        slots: { breakfast: [], lunch: [], dinner: [] },
        note: null,
      };

      mockPrisma.mealPlan.findFirst.mockResolvedValue(existingPlan);
      mockPrisma.recipe.count.mockResolvedValue(2);
      mockPrisma.mealPlan.update.mockResolvedValue({
        ...existingPlan,
        slots: {
          ...existingPlan.slots,
          breakfast: dto.set,
        },
      });

      const result = await service.patchSlot(userId, id, dto);

      const slots = result.slots as any;
      expect(slots.breakfast).toEqual(dto.set);
    });

    it("should add recipe to slot", async () => {
      const userId = "user-123";
      const id = "plan-1";
      const dto: PatchSlotDto = {
        slot: "breakfast",
        add: "recipe-1",
      };

      const existingPlan = {
        id,
        userId,
        date: new Date("2024-01-15"),
        slots: { breakfast: [], lunch: [], dinner: [] },
        note: null,
      };

      mockPrisma.mealPlan.findFirst.mockResolvedValue(existingPlan);
      mockPrisma.recipe.findUnique.mockResolvedValue({
        id: "recipe-1",
        title: "Test Recipe",
      });
      mockPrisma.mealPlan.update.mockResolvedValue({
        ...existingPlan,
        slots: {
          ...existingPlan.slots,
          breakfast: [dto.add],
        },
      });

      const result = await service.patchSlot(userId, id, dto);

      const slots = result.slots as any;
      expect(slots.breakfast).toContain(dto.add);
    });

    it("should remove recipe from slot", async () => {
      const userId = "user-123";
      const id = "plan-1";
      const dto: PatchSlotDto = {
        slot: "breakfast",
        remove: "recipe-1",
      };

      const existingPlan = {
        id,
        userId,
        date: new Date("2024-01-15"),
        slots: { breakfast: ["recipe-1", "recipe-2"], lunch: [], dinner: [] },
        note: null,
      };

      mockPrisma.mealPlan.findFirst.mockResolvedValue(existingPlan);
      mockPrisma.mealPlan.update.mockResolvedValue({
        ...existingPlan,
        slots: {
          ...existingPlan.slots,
          breakfast: ["recipe-2"],
        },
      });

      const result = await service.patchSlot(userId, id, dto);

      const slots = result.slots as any;
      expect(slots.breakfast).not.toContain(dto.remove);
      expect(slots.breakfast).toContain("recipe-2");
    });

    it("should throw BadRequestException if recipe to add does not exist", async () => {
      const userId = "user-123";
      const id = "plan-1";
      const dto: PatchSlotDto = {
        slot: "breakfast",
        add: "non-existent",
      };

      const existingPlan = {
        id,
        userId,
        date: new Date("2024-01-15"),
        slots: { breakfast: [], lunch: [], dinner: [] },
        note: null,
      };

      mockPrisma.mealPlan.findFirst.mockResolvedValue(existingPlan);
      mockPrisma.recipe.findUnique.mockResolvedValue(null);

      await expect(service.patchSlot(userId, id, dto)).rejects.toThrow(
        BadRequestException
      );
    });

    it("should throw BadRequestException if recipe to remove is not in slot", async () => {
      const userId = "user-123";
      const id = "plan-1";
      const dto: PatchSlotDto = {
        slot: "breakfast",
        remove: "recipe-not-in-slot",
      };

      const existingPlan = {
        id,
        userId,
        date: new Date("2024-01-15"),
        slots: { breakfast: ["recipe-1"], lunch: [], dinner: [] },
        note: null,
      };

      mockPrisma.mealPlan.findFirst.mockResolvedValue(existingPlan);

      await expect(service.patchSlot(userId, id, dto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("copyWeek", () => {
    it("should copy meal plans from one week to another", async () => {
      const userId = "user-123";
      const from = "2024-01-01";
      const to = "2024-01-08";

      const mockSourcePlans = [
        {
          id: "plan-1",
          userId,
          date: new Date("2024-01-01"),
          slots: { breakfast: ["recipe-1"], lunch: [], dinner: [] },
          note: "Monday",
        },
        {
          id: "plan-2",
          userId,
          date: new Date("2024-01-02"),
          slots: { breakfast: [], lunch: ["recipe-2"], dinner: [] },
          note: "Tuesday",
        },
      ];

      mockPrisma.mealPlan.findMany.mockResolvedValue(mockSourcePlans);
      mockPrisma.mealPlan.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.mealPlan.createMany.mockResolvedValue({ count: 2 });

      const result = await service.copyWeek(userId, from, to);

      expect(mockPrisma.mealPlan.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.mealPlan.createMany).toHaveBeenCalled();
      expect(result).toEqual({ copied: 2 });
    });
  });

  describe("suggestMenu", () => {
    it("should suggest menu based on preferences", async () => {
      const userId = "user-123";
      const dto: SuggestMenuDto = {
        date: "2024-01-15",
        slot: "all",
        vegetarian: false,
        persist: false,
      };

      const mockPreferences = {
        dailyKcalTarget: 2000,
        dietType: "normal",
        dislikedIngredients: [],
        likedTags: [],
      };

      const mockRecipes = [
        {
          id: "recipe-1",
          title: "Recipe 1",
          image: null,
          cookTime: 30,
          likes: 100,
          tags: ["RiceSide"],
          totalKcal: 400,
        },
        {
          id: "recipe-2",
          title: "Recipe 2",
          image: null,
          cookTime: 20,
          likes: 50,
          tags: ["Soup"],
          totalKcal: 300,
        },
        {
          id: "recipe-3",
          title: "Recipe 3",
          image: null,
          cookTime: 15,
          likes: 75,
          tags: ["Veggie"],
          totalKcal: 200,
        },
      ];

      mockPrisma.userPreference.findUnique.mockResolvedValue(mockPreferences);
      mockPrisma.recipe.findMany.mockResolvedValue(mockRecipes);

      const result = await service.suggestMenu(userId, dto);

      expect(result).toHaveProperty("date");
      expect(result).toHaveProperty("slot", dto.slot);
      expect(result).toHaveProperty("dishes");
      expect(result).toHaveProperty("totalKcal");
      expect(result).toHaveProperty("dailyKcalTarget");
      expect(result).toHaveProperty("withinLimit");
    });

    it("should filter recipes by excluded ingredients", async () => {
      const userId = "user-123";
      const dto: SuggestMenuDto = {
        date: "2024-01-15",
        slot: "all",
        excludeIngredientNames: "thịt heo, hành tây",
        persist: false,
      };

      const mockPreferences = {
        dailyKcalTarget: 2000,
        dietType: "normal",
        dislikedIngredients: [],
        likedTags: [],
      };

      mockPrisma.userPreference.findUnique.mockResolvedValue(mockPreferences);
      mockPrisma.recipe.findMany.mockResolvedValue([]);

      await service.suggestMenu(userId, dto);

      expect(mockPrisma.recipe.findMany).toHaveBeenCalled();
    });
  });

  describe("shoppingListFromRange", () => {
    it("should generate shopping list from meal plans", async () => {
      const userId = "user-123";
      const startIso = "2024-01-01";
      const endIso = "2024-01-07";

      const mockMealPlans = [
        {
          id: "plan-1",
          userId,
          date: new Date("2024-01-01"),
          slots: {
            breakfast: ["recipe-1"],
            lunch: [],
            dinner: [],
          },
        },
      ];

      const mockRecipes = [
        {
          id: "recipe-1",
          items: [
            {
              ingredient: {
                id: "ing-1",
                name: "Thịt heo",
                unit: "gram",
              },
              amount: 500,
              unitOverride: null,
            },
          ],
        },
      ];

      const mockIngredients = [
        {
          id: "ing-1",
          pricePerUnit: 100000,
          priceCurrency: "VND",
          priceUpdatedAt: new Date(),
        },
      ];

      mockPrisma.mealPlan.findMany.mockResolvedValue(mockMealPlans);
      mockPrisma.recipe.findMany.mockResolvedValue(mockRecipes);
      mockAIService.isEnabled.mockReturnValue(false);
      mockPrisma.ingredient.findMany.mockResolvedValue(mockIngredients);

      const result = await service.shoppingListFromRange(
        userId,
        startIso,
        endIso
      );

      expect(result).toHaveProperty("items");
      expect(result.items.length).toBeGreaterThan(0);
    });
  });
});
