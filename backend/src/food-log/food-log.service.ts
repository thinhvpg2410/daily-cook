import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFoodLogDto } from "./dto/create-food-log.dto";
import { UpdateFoodLogDto } from "./dto/update-food-log.dto";
import { QueryFoodLogDto } from "./dto/query-food-log.dto";
import { startOfDay, endOfDay, formatISO, subDays, differenceInDays } from "date-fns";

@Injectable()
export class FoodLogService {
  constructor(private prisma: PrismaService) {}

  private asDate(d: string) {
    const dt = new Date(d);
    if (isNaN(+dt)) throw new BadRequestException("Ngày không hợp lệ");
    return startOfDay(dt);
  }

  async create(userId: string, dto: CreateFoodLogDto) {
    const date = this.asDate(dto.date);

    // If recipeId is provided, fetch recipe nutrition data
    let kcal = dto.kcal;
    let protein = dto.protein;
    let fat = dto.fat;
    let carbs = dto.carbs;

    if (dto.recipeId) {
      const recipe = await this.prisma.recipe.findUnique({
        where: { id: dto.recipeId },
      });
      if (!recipe) {
        throw new NotFoundException("Recipe not found");
      }
      // Use recipe nutrition if not provided
      if (!kcal) kcal = recipe.totalKcal ?? undefined;
      if (!protein) protein = recipe.protein ?? undefined;
      if (!fat) fat = recipe.fat ?? undefined;
      if (!carbs) carbs = recipe.carbs ?? undefined;
    }

    return this.prisma.foodLog.create({
      data: {
        userId,
        date,
        mealType: dto.mealType,
        recipeId: dto.recipeId ?? null,
        kcal: kcal ?? null,
        protein: protein ?? null,
        fat: fat ?? null,
        carbs: carbs ?? null,
        note: dto.note ?? null,
      },
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
    });
  }

  async findAll(userId: string, query: QueryFoodLogDto) {
    const where: any = { userId };

    if (query.start || query.end) {
      where.date = {};
      if (query.start) {
        where.date.gte = this.asDate(query.start);
      }
      if (query.end) {
        where.date.lte = endOfDay(this.asDate(query.end));
      }
    }

    const logs = await this.prisma.foodLog.findMany({
      where,
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

    return logs;
  }

  async getStats(userId: string, startDate: string, endDate: string) {
    const start = this.asDate(startDate);
    const end = endOfDay(this.asDate(endDate));

    const logs = await this.prisma.foodLog.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
    });

    // Group by date
    const byDate = new Map<string, typeof logs>();
    logs.forEach((log) => {
      const dateStr = formatISO(log.date, { representation: "date" });
      if (!byDate.has(dateStr)) {
        byDate.set(dateStr, []);
      }
      byDate.get(dateStr)!.push(log);
    });

    // Calculate daily totals
    const dailyStats = Array.from(byDate.entries()).map(([date, dayLogs]) => {
      const totals = dayLogs.reduce(
        (acc, log) => ({
          calories: acc.calories + (log.kcal ?? 0),
          protein: acc.protein + (log.protein ?? 0),
          fat: acc.fat + (log.fat ?? 0),
          carbs: acc.carbs + (log.carbs ?? 0),
        }),
        { calories: 0, protein: 0, fat: 0, carbs: 0 }
      );

      return {
        date,
        ...totals,
      };
    });

    // Calculate averages
    const avg = dailyStats.reduce(
      (acc, day) => ({
        calories: acc.calories + day.calories / dailyStats.length,
        protein: acc.protein + day.protein / dailyStats.length,
        fat: acc.fat + day.fat / dailyStats.length,
        carbs: acc.carbs + day.carbs / dailyStats.length,
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );

    return {
      daily: dailyStats,
      average: {
        calories: Math.round(avg.calories),
        protein: Math.round(avg.protein),
        fat: Math.round(avg.fat),
        carbs: Math.round(avg.carbs),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const log = await this.prisma.foodLog.findFirst({
      where: { id, userId },
      include: {
        recipe: {
          select: {
            id: true,
            title: true,
            image: true,
            totalKcal: true,
            protein: true,
            fat: true,
            carbs: true,
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException("Food log not found");
    }

    return log;
  }

  async update(userId: string, id: string, dto: UpdateFoodLogDto) {
    const log = await this.findOne(userId, id);

    const updateData: any = {};
    if (dto.date) updateData.date = this.asDate(dto.date);
    if (dto.mealType) updateData.mealType = dto.mealType;
    if (dto.recipeId !== undefined) updateData.recipeId = dto.recipeId ?? null;
    if (dto.kcal !== undefined) updateData.kcal = dto.kcal ?? null;
    if (dto.protein !== undefined) updateData.protein = dto.protein ?? null;
    if (dto.fat !== undefined) updateData.fat = dto.fat ?? null;
    if (dto.carbs !== undefined) updateData.carbs = dto.carbs ?? null;
    if (dto.note !== undefined) updateData.note = dto.note ?? null;

    return this.prisma.foodLog.update({
      where: { id },
      data: updateData,
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
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.foodLog.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Lấy thống kê món nấu nhiều nhất
   * Tính toán dựa trên food logs có recipeId
   */
  async getCookingStats(userId: string, limit: number = 10) {
    const logs = await this.prisma.foodLog.findMany({
      where: {
        userId,
        recipeId: { not: null },
      },
      include: {
        recipe: {
          select: {
            id: true,
            title: true,
            image: true,
            totalKcal: true,
            fat: true,
            protein: true,
            carbs: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Group by recipeId and count
    const recipeCounts = new Map<
      string,
      {
        recipeId: string;
        recipe: any;
        count: number;
        lastCooked: Date;
        dates: Date[];
      }
    >();

    logs.forEach((log) => {
      if (!log.recipeId || !log.recipe) return;

      if (!recipeCounts.has(log.recipeId)) {
        recipeCounts.set(log.recipeId, {
          recipeId: log.recipeId,
          recipe: log.recipe,
          count: 0,
          lastCooked: log.date,
          dates: [],
        });
      }

      const stat = recipeCounts.get(log.recipeId)!;
      stat.count++;
      stat.dates.push(log.date);
      if (log.date > stat.lastCooked) {
        stat.lastCooked = log.date;
      }
    });

    // Convert to array and sort by count
    const topDishes = Array.from(recipeCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((stat) => ({
        recipeId: stat.recipeId,
        name: stat.recipe.title,
        image: stat.recipe.image,
        count: stat.count,
        lastCooked: formatISO(stat.lastCooked, { representation: "date" }),
        kcal: stat.recipe.totalKcal ?? null,
        fat: stat.recipe.fat ?? null,
        protein: stat.recipe.protein ?? null,
        carbs: stat.recipe.carbs ?? null,
      }));

    return {
      topDishes,
      totalUniqueRecipes: recipeCounts.size,
      totalCooked: logs.length,
    };
  }

  /**
   * Lấy lịch sử nấu ăn với logic nhắc nhở tránh trùng lặp thông minh
   */
  async getCookingHistory(userId: string, query: QueryFoodLogDto) {
    const where: any = { userId };

    if (query.start || query.end) {
      where.date = {};
      if (query.start) {
        where.date.gte = this.asDate(query.start);
      }
      if (query.end) {
        where.date.lte = endOfDay(this.asDate(query.end));
      }
    }

    // Query với đầy đủ fields cần thiết cho logic cảnh báo
    const logs = await this.prisma.foodLog.findMany({
      where,
      include: {
        recipe: {
          select: {
            id: true,
            title: true,
            image: true,
            totalKcal: true,
            fat: true,
            protein: true,
            carbs: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Tính toán các thông tin thông minh cho mỗi log
    const now = new Date();
    const historyWithWarnings = logs.map((log) => {
      if (!log.recipeId || !log.recipe) {
        return {
          ...log,
          warnings: [],
          cookedTimes: 0,
        };
      }

      const warnings: string[] = [];
      const date = new Date(log.date);
      const daysSinceCooked = differenceInDays(now, date);

      // Kiểm tra món nhiều calo/chất béo
      const kcal = log.kcal ?? log.recipe.totalKcal ?? 0;
      const fat = log.fat ?? log.recipe.fat ?? 0;
      if (kcal >= 700 || fat >= 25) {
        warnings.push("highCalorie");
      }

      // Kiểm tra trùng lặp gần đây
      if (daysSinceCooked <= 7) {
        warnings.push("recentDuplicate");
      } else if (daysSinceCooked <= 14) {
        warnings.push("moderateDuplicate");
      }

      // Đếm số lần đã nấu món này
      const cookedTimes = logs.filter(
        (l) => l.recipeId === log.recipeId
      ).length;

      return {
        ...log,
        warnings,
        cookedTimes,
        daysSinceCooked,
      };
    });

    // Tính toán pattern trùng lặp thông minh hơn
    // Tìm các món thường xuyên được nấu trong khoảng thời gian ngắn
    const recipeFrequency = new Map<string, Date[]>();
    logs.forEach((log) => {
      if (log.recipeId) {
        if (!recipeFrequency.has(log.recipeId)) {
          recipeFrequency.set(log.recipeId, []);
        }
        recipeFrequency.get(log.recipeId)!.push(log.date);
      }
    });

    const frequentRecipes: string[] = [];
    recipeFrequency.forEach((dates, recipeId) => {
      // Sắp xếp dates
      dates.sort((a, b) => a.getTime() - b.getTime());
      
      // Kiểm tra nếu có ít nhất 2 lần nấu trong vòng 14 ngày
      for (let i = 0; i < dates.length - 1; i++) {
        const daysDiff = differenceInDays(dates[i + 1], dates[i]);
        if (daysDiff <= 14) {
          frequentRecipes.push(recipeId);
          break;
        }
      }
    });

    // Đánh dấu các món thường xuyên trùng lặp
    const enhancedHistory = historyWithWarnings.map((item) => {
      if (item.recipeId && frequentRecipes.includes(item.recipeId)) {
        return {
          ...item,
          warnings: [...item.warnings, "frequentDuplicate"],
        };
      }
      return item;
    });

    return {
      history: enhancedHistory,
      summary: {
        totalItems: logs.length,
        uniqueRecipes: recipeFrequency.size,
        frequentDuplicateRecipes: frequentRecipes.length,
      },
    };
  }
}

