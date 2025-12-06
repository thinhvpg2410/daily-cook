import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { FoodLogService } from "./food-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFoodLogDto } from "./dto/create-food-log.dto";
import { UpdateFoodLogDto } from "./dto/update-food-log.dto";
import { QueryFoodLogDto } from "./dto/query-food-log.dto";

describe("FoodLogService", () => {
  let service: FoodLogService;
  let prisma: PrismaService;

  const mockPrisma = {
    foodLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    recipe: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodLogService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FoodLogService>(FoodLogService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a food log successfully", async () => {
      const userId = "user-123";
      const dto: CreateFoodLogDto = {
        date: "2024-01-15",
        mealType: "breakfast",
        kcal: 500,
        protein: 20,
        fat: 10,
        carbs: 60,
        note: "Morning meal",
      };

      const mockFoodLog = {
        id: "log-123",
        userId,
        ...dto,
        recipeId: null,
        createdAt: new Date(),
        recipe: null,
      };

      mockPrisma.foodLog.create.mockResolvedValue(mockFoodLog);

      const result = await service.create(userId, dto);

      expect(mockPrisma.foodLog.create).toHaveBeenCalled();
      expect(result).toEqual(mockFoodLog);
    });

    it("should create food log with recipe nutrition data", async () => {
      const userId = "user-123";
      const dto: CreateFoodLogDto = {
        date: "2024-01-15",
        mealType: "lunch",
        recipeId: "recipe-123",
      };

      const mockRecipe = {
        id: "recipe-123",
        totalKcal: 600,
        protein: 30,
        fat: 15,
        carbs: 70,
      };

      const mockFoodLog = {
        id: "log-123",
        userId,
        date: new Date(dto.date),
        mealType: dto.mealType,
        recipeId: dto.recipeId,
        kcal: mockRecipe.totalKcal,
        protein: mockRecipe.protein,
        fat: mockRecipe.fat,
        carbs: mockRecipe.carbs,
        note: null,
        recipe: {
          id: mockRecipe.id,
          title: "Test Recipe",
          image: null,
          totalKcal: mockRecipe.totalKcal,
        },
      };

      mockPrisma.recipe.findUnique.mockResolvedValue(mockRecipe);
      mockPrisma.foodLog.create.mockResolvedValue(mockFoodLog);

      const result = await service.create(userId, dto);

      expect(mockPrisma.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: dto.recipeId },
      });
      expect(mockPrisma.foodLog.create).toHaveBeenCalled();
      expect(result.kcal).toBe(mockRecipe.totalKcal);
    });

    it("should throw NotFoundException if recipe not found", async () => {
      const userId = "user-123";
      const dto: CreateFoodLogDto = {
        date: "2024-01-15",
        mealType: "lunch",
        recipeId: "non-existent",
      };

      mockPrisma.recipe.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(
        NotFoundException
      );
    });

    it("should throw BadRequestException for invalid date", async () => {
      const userId = "user-123";
      const dto: CreateFoodLogDto = {
        date: "invalid-date",
        mealType: "breakfast",
        kcal: 500,
      };

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("findAll", () => {
    it("should return all food logs for user", async () => {
      const userId = "user-123";
      const query: QueryFoodLogDto = {};

      const mockLogs = [
        {
          id: "log-1",
          userId,
          date: new Date("2024-01-15"),
          mealType: "breakfast",
          recipe: null,
        },
        {
          id: "log-2",
          userId,
          date: new Date("2024-01-15"),
          mealType: "lunch",
          recipe: null,
        },
      ];

      mockPrisma.foodLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.findAll(userId, query);

      expect(mockPrisma.foodLog.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          recipe: {
            select: {
              id: true,
              title: true,
              image: true,
              totalKcal: true,
            },
          },
        },
        orderBy: { date: "desc" },
      });
      expect(result).toEqual(mockLogs);
    });

    it("should filter by date range", async () => {
      const userId = "user-123";
      const query: QueryFoodLogDto = {
        start: "2024-01-01",
        end: "2024-01-31",
      };

      mockPrisma.foodLog.findMany.mockResolvedValue([]);

      await service.findAll(userId, query);

      expect(mockPrisma.foodLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });
  });

  describe("getStats", () => {
    it("should calculate daily stats correctly", async () => {
      const userId = "user-123";
      const startDate = "2024-01-01";
      const endDate = "2024-01-02";

      const mockLogs = [
        {
          id: "log-1",
          userId,
          date: new Date("2024-01-01"),
          kcal: 500,
          protein: 20,
          fat: 10,
          carbs: 60,
        },
        {
          id: "log-2",
          userId,
          date: new Date("2024-01-01"),
          kcal: 600,
          protein: 30,
          fat: 15,
          carbs: 70,
        },
        {
          id: "log-3",
          userId,
          date: new Date("2024-01-02"),
          kcal: 400,
          protein: 15,
          fat: 8,
          carbs: 50,
        },
      ];

      mockPrisma.foodLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getStats(userId, startDate, endDate);

      expect(result).toHaveProperty("daily");
      expect(result).toHaveProperty("average");
      expect(result.daily).toHaveLength(2);
      expect(result.daily[0].calories).toBe(1100); // 500 + 600
      expect(result.daily[0].protein).toBe(50); // 20 + 30
      expect(result.average.calories).toBe(750); // (1100 + 400) / 2
    });
  });

  describe("findOne", () => {
    it("should return a food log by id", async () => {
      const userId = "user-123";
      const id = "log-123";

      const mockLog = {
        id,
        userId,
        date: new Date("2024-01-15"),
        mealType: "breakfast",
        recipe: null,
      };

      mockPrisma.foodLog.findFirst.mockResolvedValue(mockLog);

      const result = await service.findOne(userId, id);

      expect(mockPrisma.foodLog.findFirst).toHaveBeenCalledWith({
        where: { id, userId },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockLog);
    });

    it("should throw NotFoundException if log not found", async () => {
      const userId = "user-123";
      const id = "non-existent";

      mockPrisma.foodLog.findFirst.mockResolvedValue(null);

      await expect(service.findOne(userId, id)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("update", () => {
    it("should update a food log", async () => {
      const userId = "user-123";
      const id = "log-123";
      const dto: UpdateFoodLogDto = {
        kcal: 600,
        note: "Updated note",
      };

      const existingLog = {
        id,
        userId,
        date: new Date("2024-01-15"),
        mealType: "breakfast",
        recipe: null,
      };

      const updatedLog = {
        ...existingLog,
        ...dto,
        recipe: null,
      };

      mockPrisma.foodLog.findFirst.mockResolvedValue(existingLog);
      mockPrisma.foodLog.update.mockResolvedValue(updatedLog);

      const result = await service.update(userId, id, dto);

      expect(mockPrisma.foodLog.update).toHaveBeenCalled();
      expect(result.kcal).toBe(dto.kcal);
      expect(result.note).toBe(dto.note);
    });
  });

  describe("remove", () => {
    it("should delete a food log", async () => {
      const userId = "user-123";
      const id = "log-123";

      const existingLog = {
        id,
        userId,
        date: new Date("2024-01-15"),
        mealType: "breakfast",
      };

      mockPrisma.foodLog.findFirst.mockResolvedValue(existingLog);
      mockPrisma.foodLog.delete.mockResolvedValue(existingLog);

      const result = await service.remove(userId, id);

      expect(mockPrisma.foodLog.delete).toHaveBeenCalledWith({
        where: { id },
      });
      expect(result).toEqual({ deleted: true });
    });
  });
});
