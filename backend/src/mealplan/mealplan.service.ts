import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMealPlanDto } from "./dto/create-mealplan.dto";
import { UpdateMealPlanDto } from "./dto/update-mealplan.dto";
import { QueryMealPlanDto } from "./dto/query-mealplan.dto";
import { PatchSlotDto } from "./dto/patch-slot.dto";
import {
  addDays,
  endOfWeek,
  formatISO,
  startOfDay,
  startOfWeek,
} from "date-fns";

import { SuggestMenuDto } from "./dto/suggest-menu.dto";
import { Prisma } from "@prisma/client";

type Slots = { breakfast?: string[]; lunch?: string[]; dinner?: string[] };

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

@Injectable()
export class MealPlanService {
  constructor(private prisma: PrismaService) {}

  async suggestMeal(
    userId: string,
    region?: string,
    dietType?: string,
    targetKcal?: number,
  ) {
    // 1️⃣ Lấy UserPreference
    const pref = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    const kcalTarget = targetKcal ?? pref?.dailyKcalTarget ?? 2000; // mặc định 2000 kcal/ngày
    const regionPref =
      region && region !== "All"
        ? region
        : pref?.likedTags?.find((t) =>
            ["Northern", "Central", "Southern"].includes(t),
          ) || null;
    const dietPref = dietType ?? pref?.dietType ?? "normal";

    // 2️⃣ Query tất cả recipe
    const where: any = {};
    if (regionPref) where.region = regionPref;
    if (dietPref === "vegan") where.tags = { has: "Vegan" };
    if (dietPref === "low_carb") where.tags = { has: "LowCarb" };

    const recipes = await this.prisma.recipe.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        totalKcal: true,
        image: true,
        cookTime: true,
        tags: true,
        region: true,
      },
    });

    if (!recipes.length)
      return { message: "Không có món phù hợp", recipes: [] };

    // 3️⃣ Chọn ngẫu nhiên 4–5 món sao cho tổng kcal gần target nhất
    const shuffled = recipes.sort(() => 0.5 - Math.random());
    const selected: typeof recipes = [];

    let total = 0;
    for (const r of shuffled) {
      if (total + (r.totalKcal ?? 300) <= kcalTarget + 300) {
        selected.push(r);
        total += r.totalKcal ?? 300;
      }
      if (selected.length >= 5) break;
    }

    // 4️⃣ Trả về kết quả
    return {
      userId,
      region: regionPref,
      dietType: dietPref,
      targetKcal: kcalTarget,
      totalKcal: total,
      recipes: selected,
    };
  }

  private asDate(d: string) {
    const dt = new Date(d);
    if (isNaN(+dt)) throw new BadRequestException("Ngày không hợp lệ");
    return startOfDay(dt);
  }

  private normalizeSlots(slots?: Record<string, string[]>): Slots {
    const s: Slots = {
      breakfast: Array.isArray(slots?.breakfast) ? slots!.breakfast : [],
      lunch: Array.isArray(slots?.lunch) ? slots!.lunch : [],
      dinner: Array.isArray(slots?.dinner) ? slots!.dinner : [],
    };
    return s;
  }

  async getRange(userId: string, q: QueryMealPlanDto) {
    const start = q.start
      ? this.asDate(q.start)
      : startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = q.end
      ? this.asDate(q.end)
      : endOfWeek(new Date(), { weekStartsOn: 1 });

    const rows = await this.prisma.mealPlan.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
    });

    return rows.map((r) => ({
      id: r.id,
      date: formatISO(r.date, { representation: "date" }),
      note: r.note,
      slots: r.slots as any as Slots,
    }));
  }

  async upsert(userId: string, dto: CreateMealPlanDto) {
    const date = this.asDate(dto.date);
    const exists = await this.prisma.mealPlan.findFirst({
      where: { userId, date },
    });
    const slots = this.normalizeSlots(dto.slots);

    const recipeIds = [
      ...(slots.breakfast ?? []),
      ...(slots.lunch ?? []),
      ...(slots.dinner ?? []),
    ];
    if (recipeIds.length) {
      const cnt = await this.prisma.recipe.count({
        where: { id: { in: recipeIds } },
      });
      if (cnt !== recipeIds.length)
        throw new BadRequestException("Có recipeId không tồn tại");
    }

    if (!exists) {
      return this.prisma.mealPlan.create({
        data: { userId, date, note: dto.note ?? null, slots },
      });
    }
    return this.prisma.mealPlan.update({
      where: { id: exists.id },
      data: { note: dto.note ?? exists.note, slots },
    });
  }

  async findOne(userId: string, id: string) {
    const r = await this.prisma.mealPlan.findFirst({ where: { id, userId } });
    if (!r) throw new NotFoundException("Meal plan không tồn tại");
    return r;
  }

  async update(userId: string, id: string, dto: UpdateMealPlanDto) {
    const r = await this.findOne(userId, id);
    const slots = dto.slots ? this.normalizeSlots(dto.slots) : (r.slots as any);
    return this.prisma.mealPlan.update({
      where: { id: r.id },
      data: { note: dto.note ?? r.note, slots },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.mealPlan.delete({ where: { id } });
    return { deleted: true };
  }

  async patchSlot(userId: string, id: string, dto: PatchSlotDto) {
    const r = await this.findOne(userId, id);
    const slots = this.normalizeSlots(r.slots as any);
    const current = new Set(slots[dto.slot] ?? []);

    if (dto.set) {
      const cnt = await this.prisma.recipe.count({
        where: { id: { in: dto.set } },
      });
      if (cnt !== dto.set.length)
        throw new BadRequestException("Có recipeId không tồn tại");
      slots[dto.slot] = dto.set;
    }
    if (dto.add) {
      const exists = await this.prisma.recipe.findUnique({
        where: { id: dto.add },
      });
      if (!exists) throw new BadRequestException("recipeId không tồn tại");
      current.add(dto.add);
      slots[dto.slot] = Array.from(current);
    }
    if (dto.remove) {
      current.delete(dto.remove);
      slots[dto.slot] = Array.from(current);
    }

    return this.prisma.mealPlan.update({ where: { id }, data: { slots } });
  }

  async copyWeek(userId: string, from: string, to: string) {
    const fromDate = this.asDate(from);
    const toDate = this.asDate(to);
    const fromStart = startOfWeek(fromDate, { weekStartsOn: 1 });
    const fromEnd = endOfWeek(fromDate, { weekStartsOn: 1 });
    const toStart = startOfWeek(toDate, { weekStartsOn: 1 });

    const src = await this.prisma.mealPlan.findMany({
      where: { userId, date: { gte: fromStart, lte: fromEnd } },
    });

    await this.prisma.mealPlan.deleteMany({
      where: {
        userId,
        date: { gte: toStart, lte: endOfWeek(toStart, { weekStartsOn: 1 }) },
      },
    });

    const data = src.map((p) => {
      const diff = Math.round(
        (p.date.getTime() - fromStart.getTime()) / (24 * 3600 * 1000),
      );
      return {
        userId,
        date: startOfDay(addDays(toStart, diff)),
        note: p.note,
        slots: p.slots as Prisma.InputJsonValue,
      };
    });

    if (!data.length) return { copied: 0 };
    await this.prisma.mealPlan.createMany({ data });
    return { copied: data.length };
  }

  async shoppingListFromRange(
    userId: string,
    startIso: string,
    endIso: string,
  ) {
    const start = this.asDate(startIso);
    const end = this.asDate(endIso);

    const plans = await this.prisma.mealPlan.findMany({
      where: { userId, date: { gte: start, lte: end } },
    });

    const recipeIds = new Set<string>();
    for (const p of plans) {
      const s = p.slots as any as Slots;
      (s.breakfast ?? []).forEach((id) => recipeIds.add(id));
      (s.lunch ?? []).forEach((id) => recipeIds.add(id));
      (s.dinner ?? []).forEach((id) => recipeIds.add(id));
    }

    const recs = await this.prisma.recipe.findMany({
      where: { id: { in: Array.from(recipeIds) } },
      include: { items: { include: { ingredient: true } } },
    });

    const agg = new Map<
      string,
      { ingredientId: string; name: string; unit?: string; qty: number }
    >();
    for (const r of recs) {
      for (const it of r.items) {
        const key = it.ingredient.id;
        const unit = it.unitOverride || it.ingredient.unit || undefined;
        const prev = agg.get(key);
        if (prev) prev.qty += it.amount;
        else
          agg.set(key, {
            ingredientId: it.ingredient.id,
            name: it.ingredient.name,
            unit,
            qty: it.amount,
          });
      }
    }
    return {
      items: Array.from(agg.values()).map((v) => ({ ...v, checked: false })),
    };
  }

  private async pickCandidates(opts: {
    mustTags: string[];
    avoidNames: string[];
    vegetarian?: boolean;
    region?: string;
    limit: number;
  }) {
    let where: any = { tags: { hasSome: opts.mustTags } };
    if (opts.vegetarian)
      where = {
        ...where,
        tags: { hasSome: [...opts.mustTags, "Vegan", "Veggie"] },
      };
    if (opts.region)
      where = {
        ...where,
        tags: {
          hasSome: [...(where.tags?.hasSome || opts.mustTags), opts.region],
        },
      };

    const rows = await this.prisma.recipe.findMany({
      where,
      select: {
        id: true,
        title: true,
        cookTime: true,
        likes: true,
        tags: true,
      },
      orderBy: [{ likes: "desc" }, { createdAt: "desc" }],
      take: 80,
    });

    const filtered = rows.filter(
      (r) => !opts.avoidNames.some((n) => r.title.toLowerCase().includes(n)),
    );
    return filtered.slice(0, opts.limit);
  }

  private pickMenuSet(
    pool: { id: string; title: string; cookTime: number | null }[],
    count: number,
  ) {
    const chosen: string[] = [];
    const used = new Set<string>();
    const shuffled = shuffle([...pool]);
    for (const r of shuffled) {
      if (used.has(r.id)) continue;
      chosen.push(r.id);
      used.add(r.id);
      if (chosen.length >= count) break;
    }
    return chosen;
  }

  private estimateTotalTime(recipes: { cookTime: number | null }[]) {
    return recipes.reduce((s, r) => s + (r.cookTime ?? 30), 0);
  }

  async suggestMenu(userId: string, dto: SuggestMenuDto) {
    const date = this.asDate(dto.date);
    const avoid = (dto.excludeIngredientNames || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const blocks: { key: string; tags: string[]; count: number }[] = [
      { key: "main", tags: ["RiceSide", "Grilled", "Stew"], count: 1 },
      { key: "soup", tags: ["Soup"], count: 1 },
      { key: "veg", tags: ["Veggie", "StirFry"], count: 1 },
    ];
    if (dto.includeStarter)
      (blocks as any).push({
        key: "starter",
        tags: ["Salad", "Pickle"],
        count: 1,
      });
    if (dto.includeDessert)
      (blocks as any).push({
        key: "dessert",
        tags: ["Dessert", "Drinks"],
        count: 1,
      });

    const pools: Record<string, any[]> = {};
    for (const b of blocks as any[]) {
      pools[b.key] = await this.pickCandidates({
        mustTags: b.tags,
        avoidNames: avoid,
        vegetarian: dto.vegetarian,
        region: dto.region,
        limit: 30,
      });
    }

    const pickIds: string[] = [];
    for (const b of blocks as any[]) {
      const chosen = this.pickMenuSet(
        pools[b.key].map((x) => ({
          id: x.id,
          title: x.title,
          cookTime: x.cookTime,
        })),
        b.count,
      );
      pickIds.push(...chosen);
    }

    if (dto.maxCookTime) {
      const picked = await this.prisma.recipe.findMany({
        where: { id: { in: pickIds } },
        select: { cookTime: true },
      });
      const total = this.estimateTotalTime(picked);
      if (total > dto.maxCookTime) {
        if (dto.includeDessert) pickIds.splice(-1, 1);
      }
    }

    const result = await this.prisma.recipe.findMany({
      where: { id: { in: pickIds } },
      select: {
        id: true,
        title: true,
        image: true,
        cookTime: true,
        likes: true,
        tags: true,
      },
    });

    if (dto.persist ?? true) {
      const upsertForSlot = async (slot: "breakfast" | "lunch" | "dinner") => {
        const exists = await this.prisma.mealPlan.findFirst({
          where: { userId, date },
        });
        const slots: Slots = exists ? (exists.slots as any as Slots) : {};
        const ids = result.map((r) => r.id);
        slots[slot] = ids;
        if (!exists)
          await this.prisma.mealPlan.create({ data: { userId, date, slots } });
        else
          await this.prisma.mealPlan.update({
            where: { id: exists.id },
            data: { slots },
          });
      };

      if (dto.slot === "all") {
        await upsertForSlot("lunch");
        await upsertForSlot("dinner");
        const lightIds = result
          .filter((r) =>
            r.tags.some((t) => ["Veggie", "Soup", "Salad"].includes(t)),
          )
          .slice(0, 3)
          .map((r) => r.id);
        const exists = await this.prisma.mealPlan.findFirst({
          where: { userId, date },
        });
        const slots: Slots = exists ? (exists.slots as any as Slots) : {};
        slots.breakfast = lightIds.length
          ? lightIds
          : result.slice(0, 2).map((r) => r.id);
        if (!exists)
          await this.prisma.mealPlan.create({ data: { userId, date, slots } });
        else
          await this.prisma.mealPlan.update({
            where: { id: exists.id },
            data: { slots },
          });
      } else {
        await upsertForSlot(dto.slot);
      }
    }

    return {
      date: date.toISOString().slice(0, 10),
      slot: dto.slot,
      dishes: result,
    };
  }

  async getTodaySuggest(userId: string, slot?: string) {
    const today = startOfDay(new Date());
    const todayStr = formatISO(today, { representation: "date" });

    // Kiểm tra xem đã có meal plan cho hôm nay chưa
    const existingPlan = await this.prisma.mealPlan.findFirst({
      where: { userId, date: today },
    });

    if (existingPlan) {
      const slots = this.normalizeSlots(existingPlan.slots as any);
      const recipeIds = [
        ...(slots.breakfast ?? []),
        ...(slots.lunch ?? []),
        ...(slots.dinner ?? []),
      ];

      if (recipeIds.length > 0) {
        const recipes = await this.prisma.recipe.findMany({
          where: { id: { in: recipeIds } },
          select: {
            id: true,
            title: true,
            description: true,
            image: true,
            cookTime: true,
            likes: true,
            tags: true,
            totalKcal: true,
            region: true,
          },
        });

        const breakfastRecipes = recipes.filter((r) =>
          slots.breakfast?.includes(r.id),
        );
        const lunchRecipes = recipes.filter((r) =>
          slots.lunch?.includes(r.id),
        );
        const dinnerRecipes = recipes.filter((r) =>
          slots.dinner?.includes(r.id),
        );

        return {
          date: todayStr,
          hasPlan: true,
          breakfast: breakfastRecipes,
          lunch: lunchRecipes,
          dinner: dinnerRecipes,
          totalKcal:
            breakfastRecipes.reduce((s, r) => s + (r.totalKcal ?? 0), 0) +
            lunchRecipes.reduce((s, r) => s + (r.totalKcal ?? 0), 0) +
            dinnerRecipes.reduce((s, r) => s + (r.totalKcal ?? 0), 0),
        };
      }
    }

    // Nếu chưa có plan, tạo gợi ý thông minh
    const pref = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    // Lấy lịch sử meal plans gần đây để tránh lặp lại
    const recentPlans = await this.prisma.mealPlan.findMany({
      where: {
        userId,
        date: { gte: addDays(today, -7), lt: today },
      },
      take: 7,
    });

    const recentRecipeIds = new Set<string>();
    recentPlans.forEach((p) => {
      const s = this.normalizeSlots(p.slots as any);
      (s.breakfast ?? []).forEach((id) => recentRecipeIds.add(id));
      (s.lunch ?? []).forEach((id) => recentRecipeIds.add(id));
      (s.dinner ?? []).forEach((id) => recentRecipeIds.add(id));
    });

    // Lấy user preferences
    const region = pref?.likedTags?.find((t) =>
      ["Northern", "Central", "Southern"].includes(t),
    );
    const dietType = pref?.dietType ?? "normal";
    const dislikedIngredients = pref?.dislikedIngredients ?? [];

    // Tạo gợi ý cho từng bữa ăn
    const suggestForSlot = async (
      slotType: "breakfast" | "lunch" | "dinner",
    ) => {
      const tags =
        slotType === "breakfast"
          ? ["Breakfast", "Veggie", "Soup"]
          : slotType === "lunch"
            ? ["RiceSide", "Grilled", "Stew", "Soup"]
            : ["RiceSide", "Grilled", "Stew", "Soup", "Veggie"];

      let where: any = {
        tags: { hasSome: tags },
      };

      // Chỉ thêm notIn nếu có recent recipes để tránh
      if (recentRecipeIds.size > 0) {
        where.id = { notIn: Array.from(recentRecipeIds) };
      }

      if (region) where.region = region;
      if (dietType === "vegan") where.tags = { hasSome: [...tags, "Vegan"] };
      if (dietType === "low_carb") where.tags = { hasSome: [...tags, "LowCarb"] };

      const candidates = await this.prisma.recipe.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          image: true,
          cookTime: true,
          likes: true,
          tags: true,
          totalKcal: true,
          region: true,
        },
        orderBy: [{ likes: "desc" }, { createdAt: "desc" }],
        take: 20,
      });

      // Lọc bỏ các món có ingredient không thích
      const filtered = candidates.filter((r) => {
        // Nếu có disliked ingredients, cần check trong recipe items
        // Tạm thời chỉ filter bằng title/description
        if (dislikedIngredients.length === 0) return true;
        const titleDesc = `${r.title} ${r.description || ""}`.toLowerCase();
        return !dislikedIngredients.some((ing) =>
          titleDesc.includes(ing.toLowerCase()),
        );
      });

      // Chọn ngẫu nhiên 1-2 món
      const shuffled = shuffle([...filtered]);
      return shuffled.slice(0, slotType === "breakfast" ? 1 : 2);
    };

    const breakfast = await suggestForSlot("breakfast");
    const lunch = await suggestForSlot("lunch");
    const dinner = await suggestForSlot("dinner");

    const allRecipeIds = [
      ...breakfast.map((r) => r.id),
      ...lunch.map((r) => r.id),
      ...dinner.map((r) => r.id),
    ];

    const totalKcal =
      breakfast.reduce((s, r) => s + (r.totalKcal ?? 0), 0) +
      lunch.reduce((s, r) => s + (r.totalKcal ?? 0), 0) +
      dinner.reduce((s, r) => s + (r.totalKcal ?? 0), 0);

    // Log recommendation to AI log
    await this.prisma.aIRecommendationLog.create({
      data: {
        userId,
        input: {
          date: todayStr,
          slot: slot || "all",
          region,
          dietType,
          hasRecentHistory: recentPlans.length > 0,
        },
        output: {
          breakfast: breakfast.map((r) => r.id),
          lunch: lunch.map((r) => r.id),
          dinner: dinner.map((r) => r.id),
          totalKcal,
        },
        modelName: "DailyCook-v1",
      },
    });

    // Nếu chỉ request một slot cụ thể
    if (slot === "breakfast") {
      return {
        date: todayStr,
        hasPlan: false,
        breakfast,
        lunch: [],
        dinner: [],
        totalKcal: breakfast.reduce((s, r) => s + (r.totalKcal ?? 0), 0),
      };
    }
    if (slot === "lunch") {
      return {
        date: todayStr,
        hasPlan: false,
        breakfast: [],
        lunch,
        dinner: [],
        totalKcal: lunch.reduce((s, r) => s + (r.totalKcal ?? 0), 0),
      };
    }
    if (slot === "dinner") {
      return {
        date: todayStr,
        hasPlan: false,
        breakfast: [],
        lunch: [],
        dinner,
        totalKcal: dinner.reduce((s, r) => s + (r.totalKcal ?? 0), 0),
      };
    }

    return {
      date: todayStr,
      hasPlan: false,
      breakfast,
      lunch,
      dinner,
      totalKcal,
    };
  }
}
