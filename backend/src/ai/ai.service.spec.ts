import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { AIService } from "./ai.service";
import { PrismaService } from "../prisma/prisma.service";
import { MealPlanService } from "../mealplan/mealplan.service";
import { GoogleGenerativeAI } from "@google/generative-ai";

jest.mock("@google/generative-ai");

describe("AIService", () => {
  let service: AIService;
  let prisma: PrismaService;
  let mealPlanService: MealPlanService;

  const mockPrisma = {
    userPreference: {
      findUnique: jest.fn(),
    },
    mealPlan: {
      findMany: jest.fn(),
    },
  };

  const mockMealPlanService = {
    suggestMenu: jest.fn(),
  };

  const mockModel = {
    generateContent: jest.fn(),
    startChat: jest.fn(),
  };

  const mockGenAI = {
    getGenerativeModel: jest.fn(),
  };

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test_api_key";
    (GoogleGenerativeAI as jest.MockedClass<
      typeof GoogleGenerativeAI
    >).mockImplementation(() => mockGenAI as any);
    mockGenAI.getGenerativeModel.mockReturnValue(mockModel as any);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MealPlanService, useValue: mockMealPlanService },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    prisma = module.get<PrismaService>(PrismaService);
    mealPlanService = module.get<MealPlanService>(MealPlanService);

    jest.clearAllMocks();
  });

  describe("isEnabled", () => {
    it("should return true when model is initialized", () => {
      expect(service.isEnabled()).toBe(true);
    });

    it("should return false when API key is not set", () => {
      delete process.env.GEMINI_API_KEY;
      const serviceWithoutKey = new AIService(
        prisma,
        mealPlanService as any
      );
      expect(serviceWithoutKey.isEnabled()).toBe(false);
    });
  });

  describe("fetchIngredientMarketPrices", () => {
    it("should fetch ingredient prices successfully", async () => {
      const ingredients = [
        { name: "Thịt heo", unit: "kg" },
        { name: "Gạo", unit: "kg" },
      ];

      const mockResponse = {
        response: {
          text: jest.fn().mockReturnValue(
            JSON.stringify([
              {
                name: "Thịt heo",
                unit: "kg",
                pricePerUnit: 150000,
                currency: "VND",
                source: "Bách Hóa Xanh 2025-01-20",
              },
              {
                name: "Gạo",
                unit: "kg",
                pricePerUnit: 30000,
                currency: "VND",
                source: "Bách Hóa Xanh 2025-01-20",
              },
            ])
          ),
        },
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await service.fetchIngredientMarketPrices(ingredients);

      expect(mockModel.generateContent).toHaveBeenCalled();
      expect(result["thịt heo"]).toHaveProperty("pricePerUnit", 150000);
      expect(result["gạo"]).toHaveProperty("pricePerUnit", 30000);
    });

    it("should throw BadRequestException if AI service is not configured", async () => {
      delete process.env.GEMINI_API_KEY;
      const serviceWithoutKey = new AIService(
        prisma,
        mealPlanService as any
      );

      await expect(
        serviceWithoutKey.fetchIngredientMarketPrices([
          { name: "Test", unit: "kg" },
        ])
      ).rejects.toThrow(BadRequestException);
    });

    it("should return empty object for empty ingredients", async () => {
      const result = await service.fetchIngredientMarketPrices([]);
      expect(result).toEqual({});
    });

    it("should handle invalid JSON response", async () => {
      const ingredients = [{ name: "Test", unit: "kg" }];

      const mockResponse = {
        response: {
          text: jest.fn().mockReturnValue("Invalid response"),
        },
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      await expect(
        service.fetchIngredientMarketPrices(ingredients)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("listAvailableModels", () => {
    it("should return current model info", async () => {
      const result = await service.listAvailableModels();

      expect(result).toHaveProperty("currentModel");
      expect(result).toHaveProperty("message");
    });

    it("should throw BadRequestException if AI service is not configured", async () => {
      delete process.env.GEMINI_API_KEY;
      const serviceWithoutKey = new AIService(
        prisma,
        mealPlanService as any
      );

      await expect(serviceWithoutKey.listAvailableModels()).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("chatWithUser", () => {
    it("should chat with user successfully", async () => {
      const userId = "user-123";
      const message = "Gợi ý món ăn hôm nay";

      const mockPreferences = {
        dietType: "normal",
        dailyKcalTarget: 2000,
        dislikedIngredients: [],
        likedTags: [],
        goal: "maintain",
      };

      const mockChat = {
        sendMessage: jest.fn(),
      };

      mockPrisma.userPreference.findUnique.mockResolvedValue(mockPreferences);
      mockPrisma.mealPlan.findMany.mockResolvedValue([]);
      mockModel.startChat.mockReturnValue(mockChat);
      mockChat.sendMessage.mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue("Gợi ý món ăn cho bạn..."),
        },
      });

      const result = await service.chatWithUser(userId, message);

      expect(result).toHaveProperty("message");
      expect(result).toHaveProperty("timestamp");
    });

    it("should throw BadRequestException if AI service is not configured", async () => {
      delete process.env.GEMINI_API_KEY;
      const serviceWithoutKey = new AIService(
        prisma,
        mealPlanService as any
      );

      await expect(
        serviceWithoutKey.chatWithUser("user-123", "Hello")
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("calculateCalorieGoal", () => {
    it("should calculate calorie goal successfully", async () => {
      const userId = "user-123";
      const params = {
        gender: "male" as const,
        age: 30,
        height: 175,
        weight: 70,
        activity: "medium" as const,
        goal: "maintain" as const,
      };

      const mockAIResponse = {
        dailyKcalTarget: 2200,
        protein: 165,
        fat: 61,
        carbs: 220,
        explanation: "Mục tiêu dinh dưỡng phù hợp với bạn",
      };

      const mockResponse = {
        response: {
          text: jest.fn().mockReturnValue(JSON.stringify(mockAIResponse)),
        },
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await service.calculateCalorieGoal(userId, ...Object.values(params));

      expect(result).toHaveProperty("bmr");
      expect(result).toHaveProperty("tdee");
      expect(result).toHaveProperty("dailyKcalTarget");
      expect(result).toHaveProperty("protein");
      expect(result).toHaveProperty("fat");
      expect(result).toHaveProperty("carbs");
      expect(result).toHaveProperty("explanation");
    });

    it("should use fallback calculation if AI parsing fails", async () => {
      const userId = "user-123";
      const params = {
        gender: "male" as const,
        age: 30,
        height: 175,
        weight: 70,
        activity: "medium" as const,
        goal: "lose_weight" as const,
      };

      const mockResponse = {
        response: {
          text: jest.fn().mockReturnValue("Invalid JSON"),
        },
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await service.calculateCalorieGoal(userId, ...Object.values(params));

      // Should still return calculated values with fallback
      expect(result).toHaveProperty("dailyKcalTarget");
      expect(result).toHaveProperty("protein");
      expect(result).toHaveProperty("fat");
      expect(result).toHaveProperty("carbs");
    });
  });

  describe("generateNutritionTips", () => {
    it("should generate nutrition tips successfully", async () => {
      const userId = "user-123";
      const nutritionData = {
        daily: [
          {
            date: "2024-01-15",
            calories: 2000,
            protein: 150,
            fat: 65,
            carbs: 200,
          },
        ],
        average: {
          calories: 2000,
          protein: 150,
          fat: 65,
          carbs: 200,
        },
        calorieTarget: 2000,
      };

      const mockPreferences = {
        goal: "maintain",
        dietType: "normal",
      };

      const mockAIResponse = {
        tips: [
          "💡 Duy trì chế độ ăn cân bằng",
          "🥗 Ăn nhiều rau xanh",
        ],
        summary: "Chế độ ăn của bạn đang tốt",
        week: "7 ngày qua",
      };

      mockPrisma.userPreference.findUnique.mockResolvedValue(mockPreferences);
      const mockResponse = {
        response: {
          text: jest.fn().mockReturnValue(JSON.stringify(mockAIResponse)),
        },
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await service.generateNutritionTips(userId, nutritionData);

      expect(result).toHaveProperty("tips");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("week");
      expect(result.tips).toBeInstanceOf(Array);
    });

    it("should use fallback tips if AI parsing fails", async () => {
      const userId = "user-123";
      const nutritionData = {
        daily: [],
        average: {
          calories: 2000,
          protein: 150,
          fat: 65,
          carbs: 200,
        },
        calorieTarget: 2000,
      };

      mockPrisma.userPreference.findUnique.mockResolvedValue(null);
      const mockResponse = {
        response: {
          text: jest.fn().mockReturnValue("Invalid JSON"),
        },
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await service.generateNutritionTips(userId, nutritionData);

      // Should still return fallback tips
      expect(result).toHaveProperty("tips");
      expect(result.tips.length).toBeGreaterThan(0);
    });
  });
});
