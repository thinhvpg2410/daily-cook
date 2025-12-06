import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { RecipesService } from "./recipes.service";
import { PrismaService } from "../prisma/prisma.service";
import { QueryRecipeDto } from "./dto/query-recipe.dto";

describe("RecipesService", () => {
  let service: RecipesService;
  let prisma: PrismaService;

  const mockPrisma = {
    recipe: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    userFavoriteRecipe: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a recipe successfully", async () => {
      const authorId = "user-123";
      const dto = {
        title: "Test Recipe",
        description: "Test description",
        steps: ["Step 1", "Step 2"],
        tags: ["Tag1", "Tag2"],
        cookTime: 30,
        items: [
          {
            ingredientId: "ing-1",
            amount: 100,
            unitOverride: "g",
          },
        ],
      };

      const mockRecipe = {
        id: "recipe-123",
        authorId,
        ...dto,
        image: null,
        items: dto.items.map((item) => ({
          id: "item-1",
          ...item,
        })),
      };

      mockPrisma.recipe.create.mockResolvedValue(mockRecipe);

      const result = await service.create(authorId, dto);

      expect(mockPrisma.recipe.create).toHaveBeenCalled();
      expect(result).toEqual(mockRecipe);
    });
  });

  describe("getById", () => {
    it("should return a recipe by id", async () => {
      const id = "recipe-123";
      const mockRecipe = {
        id,
        title: "Test Recipe",
        items: [],
        author: { id: "user-123", name: "Author" },
      };

      mockPrisma.recipe.findUnique.mockResolvedValue(mockRecipe);

      const result = await service.getById(id);

      expect(mockPrisma.recipe.findUnique).toHaveBeenCalledWith({
        where: { id },
        include: {
          items: { include: { ingredient: true } },
          author: { select: { id: true, name: true } },
        },
      });
      expect(result).toEqual(mockRecipe);
    });
  });

  describe("search", () => {
    it("should search recipes by query", async () => {
      const query: QueryRecipeDto = {
        q: "phở",
        page: 1,
        limit: 10,
      };

      const mockRecipes = [
        {
          id: "recipe-1",
          title: "Phở Bò",
          description: "Traditional Vietnamese soup",
        },
      ];

      mockPrisma.$transaction.mockResolvedValue([1, mockRecipes]);

      const result = await service.search(query);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toHaveProperty("total", 1);
      expect(result).toHaveProperty("data", mockRecipes);
      expect(result).toHaveProperty("page", 1);
      expect(result).toHaveProperty("limit", 10);
    });

    it("should filter by tag", async () => {
      const query: QueryRecipeDto = {
        tag: "Vegan",
        page: 1,
        limit: 10,
      };

      mockPrisma.$transaction.mockResolvedValue([0, []]);

      await service.search(query);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("addFavorite", () => {
    it("should add recipe to favorites", async () => {
      const userId = "user-123";
      const recipeId = "recipe-123";

      const mockRecipe = {
        id: recipeId,
        title: "Test Recipe",
      };

      const mockFavorite = {
        id: "fav-123",
        userId,
        recipeId,
        recipe: {
          id: recipeId,
          title: "Test Recipe",
        },
      };

      mockPrisma.recipe.findUnique.mockResolvedValue(mockRecipe);
      mockPrisma.userFavoriteRecipe.findUnique.mockResolvedValue(null);
      mockPrisma.userFavoriteRecipe.create.mockResolvedValue(mockFavorite);

      const result = await service.addFavorite(userId, recipeId);

      expect(mockPrisma.userFavoriteRecipe.create).toHaveBeenCalledWith({
        data: { userId, recipeId },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockFavorite);
    });

    it("should return existing favorite if already favorited", async () => {
      const userId = "user-123";
      const recipeId = "recipe-123";

      const mockRecipe = {
        id: recipeId,
        title: "Test Recipe",
      };

      const existingFavorite = {
        id: "fav-123",
        userId,
        recipeId,
      };

      mockPrisma.recipe.findUnique.mockResolvedValue(mockRecipe);
      mockPrisma.userFavoriteRecipe.findUnique.mockResolvedValue(
        existingFavorite
      );

      const result = await service.addFavorite(userId, recipeId);

      expect(mockPrisma.userFavoriteRecipe.create).not.toHaveBeenCalled();
      expect(result).toEqual(existingFavorite);
    });

    it("should throw NotFoundException if recipe not found", async () => {
      const userId = "user-123";
      const recipeId = "non-existent";

      mockPrisma.recipe.findUnique.mockResolvedValue(null);

      await expect(
        service.addFavorite(userId, recipeId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("removeFavorite", () => {
    it("should remove recipe from favorites", async () => {
      const userId = "user-123";
      const recipeId = "recipe-123";

      const mockFavorite = {
        id: "fav-123",
        userId,
        recipeId,
      };

      mockPrisma.userFavoriteRecipe.findUnique.mockResolvedValue(mockFavorite);
      mockPrisma.userFavoriteRecipe.delete.mockResolvedValue(mockFavorite);

      const result = await service.removeFavorite(userId, recipeId);

      expect(mockPrisma.userFavoriteRecipe.delete).toHaveBeenCalledWith({
        where: { userId_recipeId: { userId, recipeId } },
      });
      expect(result).toEqual({ deleted: true });
    });

    it("should throw NotFoundException if favorite not found", async () => {
      const userId = "user-123";
      const recipeId = "recipe-123";

      mockPrisma.userFavoriteRecipe.findUnique.mockResolvedValue(null);

      await expect(
        service.removeFavorite(userId, recipeId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getFavorites", () => {
    it("should return user favorites", async () => {
      const userId = "user-123";

      const mockFavorites = [
        {
          id: "fav-1",
          userId,
          recipeId: "recipe-1",
          recipe: {
            id: "recipe-1",
            title: "Favorite Recipe 1",
          },
          createdAt: new Date(),
        },
        {
          id: "fav-2",
          userId,
          recipeId: "recipe-2",
          recipe: {
            id: "recipe-2",
            title: "Favorite Recipe 2",
          },
          createdAt: new Date(),
        },
      ];

      mockPrisma.userFavoriteRecipe.findMany.mockResolvedValue(mockFavorites);

      const result = await service.getFavorites(userId);

      expect(mockPrisma.userFavoriteRecipe.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: expect.any(Object),
        orderBy: { createdAt: "desc" },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("recipe");
    });
  });

  describe("isFavorite", () => {
    it("should return true if recipe is favorited", async () => {
      const userId = "user-123";
      const recipeId = "recipe-123";

      mockPrisma.userFavoriteRecipe.findUnique.mockResolvedValue({
        id: "fav-123",
      });

      const result = await service.isFavorite(userId, recipeId);

      expect(result).toEqual({ isFavorite: true });
    });

    it("should return false if recipe is not favorited", async () => {
      const userId = "user-123";
      const recipeId = "recipe-123";

      mockPrisma.userFavoriteRecipe.findUnique.mockResolvedValue(null);

      const result = await service.isFavorite(userId, recipeId);

      expect(result).toEqual({ isFavorite: false });
    });
  });
});
