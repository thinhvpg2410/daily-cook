import { Test, TestingModule } from "@nestjs/testing";
import { ShoppingListService } from "./shopping-list.service";
import { PrismaService } from "../prisma/prisma.service";
import { AIService } from "../ai/ai.service";

describe("ShoppingListService", () => {
  let service: ShoppingListService;
  let prisma: PrismaService;
  let aiService: AIService;

  const mockPrisma = {
    recipe: {
      findMany: jest.fn(),
    },
    ingredient: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    shoppingList: {
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
        ShoppingListService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AIService, useValue: mockAIService },
      ],
    }).compile();

    service = module.get<ShoppingListService>(ShoppingListService);
    prisma = module.get<PrismaService>(PrismaService);
    aiService = module.get<AIService>(AIService);

    jest.clearAllMocks();
  });

  describe("buildFromRecipes", () => {
    it("should build shopping list from recipes successfully", async () => {
      const userId = "user-123";
      const recipeIds = ["recipe-1", "recipe-2"];
      const title = "Weekly Shopping List";

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
            {
              ingredient: {
                id: "ing-2",
                name: "Hành tây",
                unit: "gram",
              },
              amount: 200,
              unitOverride: null,
            },
          ],
        },
        {
          id: "recipe-2",
          items: [
            {
              ingredient: {
                id: "ing-1",
                name: "Thịt heo",
                unit: "gram",
              },
              amount: 300,
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
        {
          id: "ing-2",
          pricePerUnit: 50000,
          priceCurrency: "VND",
          priceUpdatedAt: new Date(),
        },
      ];

      mockPrisma.recipe.findMany.mockResolvedValue(mockRecipes);
      mockAIService.isEnabled.mockReturnValue(true);
      mockAIService.fetchIngredientMarketPrices.mockResolvedValue({});
      mockPrisma.ingredient.findMany.mockResolvedValue(mockIngredients);
      mockPrisma.shoppingList.create.mockResolvedValue({
        id: "list-123",
        userId,
        title,
        items: [
          {
            ingredientId: "ing-1",
            name: "Thịt heo",
            unit: "gram",
            qty: 800,
            checked: false,
            unitPrice: 100000,
            currency: "VND",
            estimatedCost: 80000,
          },
          {
            ingredientId: "ing-2",
            name: "Hành tây",
            unit: "gram",
            qty: 200,
            checked: false,
            unitPrice: 50000,
            currency: "VND",
            estimatedCost: 10000,
          },
        ],
      });

      const result = await service.buildFromRecipes(
        userId,
        recipeIds,
        title,
        true
      );

      expect(mockPrisma.recipe.findMany).toHaveBeenCalledWith({
        where: { id: { in: recipeIds } },
        include: { items: { include: { ingredient: true } } },
      });
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("title", title);
    });

    it("should aggregate ingredients from multiple recipes", async () => {
      const userId = "user-123";
      const recipeIds = ["recipe-1", "recipe-2"];

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
        {
          id: "recipe-2",
          items: [
            {
              ingredient: {
                id: "ing-1",
                name: "Thịt heo",
                unit: "gram",
              },
              amount: 300,
              unitOverride: null,
            },
          ],
        },
      ];

      mockPrisma.recipe.findMany.mockResolvedValue(mockRecipes);
      mockAIService.isEnabled.mockReturnValue(false);
      mockPrisma.ingredient.findMany.mockResolvedValue([]);
      mockPrisma.shoppingList.create.mockResolvedValue({
        id: "list-123",
        items: [
          {
            ingredientId: "ing-1",
            name: "Thịt heo",
            qty: 800, // 500 + 300
            checked: false,
          },
        ],
      });

      const result = await service.buildFromRecipes(
        userId,
        recipeIds,
        "Test List",
        true
      );

      expect(result.items[0].qty).toBe(800);
    });

    it("should return shopping list without persisting when persist=false", async () => {
      const userId = "user-123";
      const recipeIds = ["recipe-1"];

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

      mockPrisma.recipe.findMany.mockResolvedValue(mockRecipes);
      mockAIService.isEnabled.mockReturnValue(false);
      mockPrisma.ingredient.findMany.mockResolvedValue([]);

      const result = await service.buildFromRecipes(
        userId,
        recipeIds,
        "Test List",
        false
      );

      expect(mockPrisma.shoppingList.create).not.toHaveBeenCalled();
      expect(result).toHaveProperty("title", "Test List");
      expect(result).toHaveProperty("items");
    });

    it("should use unitOverride if provided", async () => {
      const userId = "user-123";
      const recipeIds = ["recipe-1"];

      const mockRecipes = [
        {
          id: "recipe-1",
          items: [
            {
              ingredient: {
                id: "ing-1",
                name: "Muối",
                unit: "gram",
              },
              amount: 10,
              unitOverride: "muỗng cà phê",
            },
          ],
        },
      ];

      mockPrisma.recipe.findMany.mockResolvedValue(mockRecipes);
      mockAIService.isEnabled.mockReturnValue(false);
      mockPrisma.ingredient.findMany.mockResolvedValue([]);

      const result = await service.buildFromRecipes(
        userId,
        recipeIds,
        "Test List",
        false
      );

      expect(result.items[0].unit).toBe("muỗng cà phê");
    });

    it("should handle empty recipe list", async () => {
      const userId = "user-123";
      const recipeIds: string[] = [];

      mockPrisma.recipe.findMany.mockResolvedValue([]);
      mockAIService.isEnabled.mockReturnValue(false);
      mockPrisma.ingredient.findMany.mockResolvedValue([]);

      const result = await service.buildFromRecipes(
        userId,
        recipeIds,
        "Empty List",
        false
      );

      expect(result.items).toHaveLength(0);
    });
  });
});
