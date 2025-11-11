import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFoodLogDto } from "./dto/create-food-log.dto";
import { UpdateFoodLogDto } from "./dto/update-food-log.dto";
import { QueryFoodLogDto } from "./dto/query-food-log.dto";
import { startOfDay, endOfDay, formatISO } from "date-fns";

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
}

