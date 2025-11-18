import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
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
import { AIService } from "../ai/ai.service";

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
  private readonly logger = new Logger(MealPlanService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AIService))
    private aiService: AIService,
  ) {}

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
    if (!d) throw new BadRequestException("Ngày không hợp lệ");

    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [year, month, day] = d.split("-").map((v) => Number(v));
      const dt = new Date(year, month - 1, day);
      return startOfDay(dt);
    }

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

  async getDailyNutrition(userId: string, dateStr?: string) {
    const normalizedDate = dateStr?.trim()
      ? dateStr
      : formatISO(new Date(), { representation: "date" });
    const targetDate = this.asDate(normalizedDate);

    const plan = await this.prisma.mealPlan.findUnique({
      where: { userId_date: { userId, date: targetDate } },
    });

    if (!plan) {
      return {
        date: normalizedDate,
        hasPlan: false,
        meals: { breakfast: [], lunch: [], dinner: [] },
        totals: { calories: 0, protein: 0, fat: 0, carbs: 0 },
      };
    }

    const slots = this.normalizeSlots(plan.slots as any);
    const recipeIds = [
      ...(slots.breakfast ?? []),
      ...(slots.lunch ?? []),
      ...(slots.dinner ?? []),
    ];

    if (!recipeIds.length) {
      return {
        date: normalizedDate,
        hasPlan: true,
        meals: { breakfast: [], lunch: [], dinner: [] },
        totals: { calories: 0, protein: 0, fat: 0, carbs: 0 },
      };
    }

    const recipes = await this.prisma.recipe.findMany({
      where: { id: { in: recipeIds } },
      select: {
        id: true,
        title: true,
        image: true,
        totalKcal: true,
        protein: true,
        fat: true,
        carbs: true,
      },
    });
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));

    const mapMeals = (ids: string[]) =>
      ids
        .map((id) => recipeMap.get(id))
        .filter(Boolean)
        .map((r) => ({
          id: r!.id,
          title: r!.title,
          image: r!.image,
          kcal: r!.totalKcal ?? 0,
          protein: r!.protein ?? 0,
          fat: r!.fat ?? 0,
          carbs: r!.carbs ?? 0,
        }));

    const breakfast = mapMeals(slots.breakfast ?? []);
    const lunch = mapMeals(slots.lunch ?? []);
    const dinner = mapMeals(slots.dinner ?? []);

    const totals = [...breakfast, ...lunch, ...dinner].reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.kcal ?? 0),
        protein: acc.protein + (meal.protein ?? 0),
        fat: acc.fat + (meal.fat ?? 0),
        carbs: acc.carbs + (meal.carbs ?? 0),
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 },
    );

    return {
      date: normalizedDate,
      hasPlan: true,
      meals: { breakfast, lunch, dinner },
      totals,
    };
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

    const ingredientIds = new Set<string>();
    const agg = new Map<
      string,
      { ingredientId: string; name: string; unit?: string; qty: number }
    >();
    for (const r of recs) {
      for (const it of r.items) {
        const key = it.ingredient.id;
        ingredientIds.add(key);
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
    if (this.aiService?.isEnabled()) {
      await this.ensureDailyIngredientPrices(Array.from(ingredientIds));
    }

    const items = await this.attachPriceInfo(
      Array.from(agg.values()).map((v) => ({ ...v, checked: false })),
    );

    return { items };
  }

  private async pickCandidates(opts: {
    mustTags: string[];
    avoidNames: string[];
    vegetarian?: boolean;
    region?: string;
    limit: number;
    isDietMode?: boolean;
    isEatClean?: boolean;
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

    // Eat-clean mode: prefer healthy tags
    if (opts.isEatClean) {
      where = {
        ...where,
        tags: {
          hasSome: [
            ...(where.tags?.hasSome || opts.mustTags),
            "Healthy",
            "Steamed",
            "Grilled",
            "Veggie",
          ],
        },
      };
    }

    const rows = await this.prisma.recipe.findMany({
      where,
      select: {
        id: true,
        title: true,
        cookTime: true,
        likes: true,
        tags: true,
        totalKcal: true,
      },
      orderBy: [{ likes: "desc" }, { createdAt: "desc" }],
      take: 80,
    });

    let filtered = rows.filter(
      (r) => !opts.avoidNames.some((n) => r.title.toLowerCase().includes(n)),
    );

    // Diet mode: prefer low-calorie recipes (sort by calories ascending)
    if (opts.isDietMode) {
      filtered = filtered
        .sort((a, b) => (a.totalKcal || 9999) - (b.totalKcal || 9999))
        .filter((r) => (r.totalKcal || 0) < 600); // Prefer recipes under 600 kcal
    }

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

  async suggestMenu(
    userId: string,
    dto: SuggestMenuDto,
    recipeCount?: number | null,
    isDietMode?: boolean,
    isEatClean?: boolean,
  ) {
    const date = this.asDate(dto.date);
    const avoid = (dto.excludeIngredientNames || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    // Get user preferences for nutrition goals
    const userPrefs = await this.prisma.userPreference.findUnique({
      where: { userId },
    });
    const dailyKcalTarget = userPrefs?.dailyKcalTarget || 2000;

    // Determine base blocks based on recipe count
    let baseBlocks: { key: string; tags: string[]; count: number }[] = [];
    
    if (recipeCount && recipeCount > 0) {
      // Custom recipe count: adjust blocks accordingly
      if (recipeCount <= 3) {
        // Small count: main + soup or veg
        baseBlocks = [
          { key: "main", tags: ["RiceSide", "Grilled", "Stew"], count: 1 },
          { key: "soup", tags: ["Soup"], count: recipeCount >= 2 ? 1 : 0 },
          { key: "veg", tags: ["Veggie", "StirFry"], count: recipeCount >= 3 ? 1 : 0 },
        ];
      } else if (recipeCount <= 5) {
        // Medium count: main + soup + veg
        baseBlocks = [
          { key: "main", tags: ["RiceSide", "Grilled", "Stew"], count: 1 },
          { key: "soup", tags: ["Soup"], count: 1 },
          { key: "veg", tags: ["Veggie", "StirFry"], count: recipeCount >= 4 ? 1 : 0 },
        ];
      } else {
        // Large count: main + soup + veg + extras
        baseBlocks = [
          { key: "main", tags: ["RiceSide", "Grilled", "Stew"], count: Math.min(2, Math.ceil(recipeCount / 3)) },
          { key: "soup", tags: ["Soup"], count: 1 },
          { key: "veg", tags: ["Veggie", "StirFry"], count: Math.min(2, Math.ceil(recipeCount / 3)) },
        ];
      }
    } else {
      // Default: main + soup + veg
      baseBlocks = [
        { key: "main", tags: ["RiceSide", "Grilled", "Stew"], count: 1 },
        { key: "soup", tags: ["Soup"], count: 1 },
        { key: "veg", tags: ["Veggie", "StirFry"], count: 1 },
      ];
    }

    // Filter out blocks with count 0
    const blocks = baseBlocks.filter((b) => b.count > 0);

    // Add optional blocks
    if (dto.includeStarter && (!recipeCount || blocks.reduce((s, b) => s + b.count, 0) < recipeCount))
      (blocks as any).push({
        key: "starter",
        tags: ["Salad", "Pickle"],
        count: 1,
      });
    if (dto.includeDessert && (!recipeCount || blocks.reduce((s, b) => s + b.count, 0) < recipeCount))
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
        isDietMode,
        isEatClean,
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

    // Get recipes with calories
    let result = await this.prisma.recipe.findMany({
      where: { id: { in: pickIds } },
      select: {
        id: true,
        title: true,
        image: true,
        cookTime: true,
        likes: true,
        tags: true,
        totalKcal: true,
      },
    });

    // Adjust to match recipe count if specified (before calorie filtering)
    // Note: We'll adjust again after calorie filtering if needed

    // Calculate total calories and filter if exceeds daily target
    let totalKcal = result.reduce((sum, r) => sum + (r.totalKcal || 0), 0);
    
    // If total calories exceed daily target, try to replace with lower calorie options
    if (totalKcal > dailyKcalTarget) {
      // Sort recipes by calories (descending) to identify high-calorie ones
      const sortedResults = [...result].sort((a, b) => (b.totalKcal || 0) - (a.totalKcal || 0));
      
      // Try to replace high-calorie recipes with lower-calorie alternatives
      for (const highCalRecipe of sortedResults) {
        if (totalKcal <= dailyKcalTarget * 0.95) break; // Stop if we're close to target (95%)
        
        // Find which block this recipe belongs to
        let blockKey: string | null = null;
        for (const b of blocks as any[]) {
          if (highCalRecipe.tags.some((t: string) => b.tags.includes(t))) {
            blockKey = b.key;
            break;
          }
        }
        
        if (!blockKey) continue;
        
        // Try to find a lower-calorie alternative from the same pool
        const alternatives = pools[blockKey]
          .filter((alt) => alt.id !== highCalRecipe.id && (alt.totalKcal || 0) < (highCalRecipe.totalKcal || 0))
          .sort((a, b) => (a.totalKcal || 0) - (b.totalKcal || 0));
        
        if (alternatives.length > 0) {
          const replacement = alternatives[0];
          const calorieDiff = (highCalRecipe.totalKcal || 0) - (replacement.totalKcal || 0);
          
          // Replace if it helps
          if (calorieDiff > 0) {
            const index = result.findIndex((r) => r.id === highCalRecipe.id);
            if (index >= 0) {
              result[index] = {
                id: replacement.id,
                title: replacement.title,
                image: replacement.image,
                cookTime: replacement.cookTime,
                likes: replacement.likes,
                tags: replacement.tags,
                totalKcal: replacement.totalKcal,
              };
              totalKcal -= calorieDiff;
            }
          }
        }
      }
      
      // If still exceeds, remove highest calorie items (starting with dessert/starter if exists)
      if (totalKcal > dailyKcalTarget) {
        const toRemove: string[] = [];
        let remainingKcal = totalKcal;
        
        // Priority: remove dessert/starter first, then highest calorie items
        const sortedByCal = [...result].sort((a, b) => (b.totalKcal || 0) - (a.totalKcal || 0));
        
        for (const recipe of sortedByCal) {
          if (remainingKcal <= dailyKcalTarget * 0.98) break; // Stop at 98% of target
          
          // Check if it's dessert/starter
          const isDessertStarter = recipe.tags.some((t: string) => 
            ["Dessert", "Drinks", "Salad", "Pickle"].includes(t)
          );
          
          if (isDessertStarter || toRemove.length === 0) {
            toRemove.push(recipe.id);
            remainingKcal -= (recipe.totalKcal || 0);
          }
        }
        
        result = result.filter((r) => !toRemove.includes(r.id));
        totalKcal = result.reduce((sum, r) => sum + (r.totalKcal || 0), 0);
      }
    }

    // Final adjustment to match recipe count if specified (after calorie filtering)
    if (recipeCount && recipeCount > 0) {
      if (result.length > recipeCount) {
        // Keep only the first N recipes (prioritize by block order)
        result = result.slice(0, recipeCount);
        totalKcal = result.reduce((sum, r) => sum + (r.totalKcal || 0), 0);
      } else if (result.length < recipeCount) {
        // Try to add more recipes if we have less than requested
        const currentIds = new Set(result.map((r) => r.id));
        const additional: any[] = [];
        
        for (const b of blocks as any[]) {
          if (result.length + additional.length >= recipeCount) break;
          const available = pools[b.key]
            .filter((r: any) => !currentIds.has(r.id))
            .slice(0, recipeCount - result.length - additional.length);
          
          if (available.length > 0) {
            const fetched = await this.prisma.recipe.findMany({
              where: { id: { in: available.map((r: any) => r.id) } },
              select: {
                id: true,
                title: true,
                image: true,
                cookTime: true,
                likes: true,
                tags: true,
                totalKcal: true,
              },
            });
            
            // Filter by diet/eat-clean mode if needed
            let filtered = fetched;
            if (isDietMode) {
              filtered = fetched
                .filter((r) => (r.totalKcal || 0) < 600)
                .sort((a, b) => (a.totalKcal || 0) - (b.totalKcal || 0));
            }
            if (isEatClean) {
              filtered = filtered.filter((r) =>
                r.tags.some((t: string) => ["Healthy", "Steamed", "Grilled", "Veggie"].includes(t))
              );
            }
            
            additional.push(...filtered);
          }
        }
        
        if (additional.length > 0) {
          result = [...result, ...additional].slice(0, recipeCount);
          totalKcal = result.reduce((sum, r) => sum + (r.totalKcal || 0), 0);
        }
      }
    }

    if (dto.persist ?? true) {
      // Get or create meal plan once
      const exists = await this.prisma.mealPlan.findFirst({
        where: { userId, date },
      });
      
      const slots: Slots = exists ? (exists.slots as any as Slots) : { breakfast: [], lunch: [], dinner: [] };
      const ids = result.map((r) => r.id);

      if (dto.slot === "all") {
        // Distribute recipes to slots intelligently
        const lightRecipes = result.filter((r) =>
          r.tags.some((t) => ["Veggie", "Soup", "Salad"].includes(t)),
        );
        const otherRecipes = result.filter((r) =>
          !r.tags.some((t) => ["Veggie", "Soup", "Salad"].includes(t)),
        );
        
        // Breakfast: prefer light recipes (1-2 items)
        slots.breakfast = lightRecipes.length > 0
          ? lightRecipes.slice(0, 2).map((r) => r.id)
          : result.slice(0, 1).map((r) => r.id);
        
        // Lunch: remaining light recipes + half of other recipes
        const remainingLight = lightRecipes.slice(2).map((r) => r.id);
        const lunchCount = Math.max(2, Math.ceil(otherRecipes.length / 2));
        const lunchOther = otherRecipes.slice(0, lunchCount).map((r) => r.id);
        const lunchIds = [...remainingLight, ...lunchOther];
        
        // Dinner: remaining other recipes
        const dinnerIds = otherRecipes.slice(lunchCount).map((r) => r.id);
        
        // If no recipes left for dinner, use some from lunch
        if (dinnerIds.length === 0 && lunchIds.length > 2) {
          slots.lunch = lunchIds.slice(0, -2);
          slots.dinner = lunchIds.slice(-2);
        } else {
          slots.lunch = lunchIds;
          slots.dinner = dinnerIds;
        }
      } else {
        // Replace the specific slot
        slots[dto.slot] = ids;
      }

      // Save once
      if (!exists) {
        await this.prisma.mealPlan.create({ data: { userId, date, slots } });
      } else {
        await this.prisma.mealPlan.update({
          where: { id: exists.id },
          data: { slots },
        });
      }
    }

    // Recalculate total calories after filtering
    const finalTotalKcal = result.reduce((sum, r) => sum + (r.totalKcal || 0), 0);

    return {
      date: date.toISOString().slice(0, 10),
      slot: dto.slot,
      dishes: result,
      totalKcal: finalTotalKcal,
      dailyKcalTarget,
      withinLimit: finalTotalKcal <= dailyKcalTarget,
    };
  }

  async getTodaySuggest(
    userId: string,
    slot?: "breakfast" | "lunch" | "dinner" | "all",
  ) {
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

    // Nếu chưa có plan, sử dụng suggestMenu với calorie filtering
    const pref = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    // Lấy user preferences
    const region = pref?.likedTags?.find((t) =>
      ["Northern", "Central", "Southern"].includes(t),
    ) as "Northern" | "Central" | "Southern" | undefined;
    const dietType = pref?.dietType ?? "normal";
    const dislikedIngredients = pref?.dislikedIngredients ?? [];

    // Xác định chế độ ăn
    const isDietMode = dietType === "low_carb" || pref?.goal === "lose_weight";
    const isEatClean = dietType === "eat_clean" || false;

    // Sử dụng suggestMenu để đảm bảo calorie filtering đúng
    const suggestions = await this.suggestMenu(
      userId,
      {
        date: todayStr,
        slot: slot ?? "all",
        region,
        vegetarian: dietType === "vegan" || dietType === "vegetarian",
        excludeIngredientNames: dislikedIngredients.join(","),
        persist: false, // Chỉ suggest, không lưu
      },
      null, // recipeCount: null để dùng default
      isDietMode,
      isEatClean,
    );

    const allDishes = suggestions.dishes || [];
    
    // Phân bổ vào breakfast/lunch/dinner dựa trên slot
    let breakfast: any[] = [];
    let lunch: any[] = [];
    let dinner: any[] = [];

    if (slot === "breakfast") {
      breakfast = allDishes.slice(0, 2); // Breakfast: 1-2 món
    } else if (slot === "lunch") {
      lunch = allDishes.slice(0, 3); // Lunch: 2-3 món
    } else if (slot === "dinner") {
      dinner = allDishes.slice(0, 3); // Dinner: 2-3 món
    } else {
      // slot === "all" hoặc không có: phân bổ thông minh
      const lightRecipes = allDishes.filter((r) =>
        r.tags.some((t: string) => ["Veggie", "Soup", "Salad", "Breakfast"].includes(t))
      );
      const otherRecipes = allDishes.filter((r) =>
        !r.tags.some((t: string) => ["Veggie", "Soup", "Salad", "Breakfast"].includes(t))
      );

      // Breakfast: prefer light recipes (1-2 items)
      breakfast = lightRecipes.length > 0
        ? lightRecipes.slice(0, 2)
        : allDishes.length > 0 ? [allDishes[0]] : [];

      // Lunch: remaining light recipes + half of other recipes
      const remainingLight = lightRecipes.slice(2);
      const lunchCount = Math.max(2, Math.ceil(otherRecipes.length / 2));
      lunch = [...remainingLight, ...otherRecipes.slice(0, lunchCount)];

      // Dinner: remaining other recipes
      const dinnerTemp = otherRecipes.slice(lunchCount);
      dinner = dinnerTemp.length > 0 ? dinnerTemp : lunch.length > 2 ? lunch.slice(-2) : [];
      
      // Adjust lunch nếu đã lấy cho dinner
      if (dinnerTemp.length === 0 && lunch.length > 2) {
        lunch = lunch.slice(0, -2);
      }
    }

    // Tính tổng calories (đã được filter bởi suggestMenu)
    const totalKcal = suggestions.totalKcal || 0;

    // Log recommendation to AI log
    await this.prisma.aIRecommendationLog.create({
      data: {
        userId,
        input: {
          date: todayStr,
          slot: slot || "all",
          region,
          dietType,
          dailyKcalTarget: pref?.dailyKcalTarget || 2000,
        },
        output: {
          breakfast: breakfast.map((r) => r.id),
          lunch: lunch.map((r) => r.id),
          dinner: dinner.map((r) => r.id),
          totalKcal,
          withinLimit: suggestions.withinLimit,
        },
        modelName: "DailyCook-v1",
      },
    });

    // Return kết quả
    if (slot === "breakfast") {
      return {
        date: todayStr,
        hasPlan: false,
        breakfast,
        lunch: [],
        dinner: [],
        totalKcal: breakfast.reduce((s, r) => s + (r.totalKcal || 0), 0),
      };
    }
    if (slot === "lunch") {
      return {
        date: todayStr,
        hasPlan: false,
        breakfast: [],
        lunch,
        dinner: [],
        totalKcal: lunch.reduce((s, r) => s + (r.totalKcal || 0), 0),
      };
    }
    if (slot === "dinner") {
      return {
        date: todayStr,
        hasPlan: false,
        breakfast: [],
        lunch: [],
        dinner,
        totalKcal: dinner.reduce((s, r) => s + (r.totalKcal || 0), 0),
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

  private async ensureDailyIngredientPrices(ingredientIds: string[]) {
    if (!ingredientIds.length || !this.aiService?.isEnabled()) return;
    const todayStart = startOfDay(new Date());

    const pending = await this.prisma.ingredient.findMany({
      where: {
        id: { in: ingredientIds },
        OR: [
          { priceUpdatedAt: null },
          { priceUpdatedAt: { lt: todayStart } },
        ],
      },
      select: { id: true, name: true, unit: true },
    });

    if (!pending.length) return;

    try {
      const priceMap = await this.aiService.fetchIngredientMarketPrices(
        pending.map((p) => ({ name: p.name, unit: p.unit || undefined })),
      );

      await Promise.all(
        pending.map(async (ing) => {
          const key = ing.name.trim().toLowerCase();
          const info = priceMap[key];
          if (!info?.pricePerUnit) return;

          await this.prisma.ingredient.update({
            where: { id: ing.id },
            data: {
              pricePerUnit: info.pricePerUnit,
              priceCurrency: info.currency || "VND",
              priceUpdatedAt: new Date(),
            },
          });
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Không thể cập nhật giá nguyên liệu: ${error?.message || error}`,
      );
    }
  }

  private async attachPriceInfo(
    items: Array<{
      ingredientId: string;
      name: string;
      unit?: string;
      qty: number;
      checked: boolean;
    }>,
  ) {
    if (!items.length) return items;

    const ingredients = await this.prisma.ingredient.findMany({
      where: { id: { in: items.map((i) => i.ingredientId) } },
      select: {
        id: true,
        pricePerUnit: true,
        priceCurrency: true,
        priceUpdatedAt: true,
      },
    });
    const priceById = new Map(ingredients.map((ing) => [ing.id, ing] as const));

    return items.map((item) => {
      const price = priceById.get(item.ingredientId);
      if (!price?.pricePerUnit) return item;
      const estimatedCost = Number(
        (price.pricePerUnit * item.qty).toFixed(2),
      );
      return {
        ...item,
        unitPrice: price.pricePerUnit,
        currency: price.priceCurrency || "VND",
        estimatedCost,
        priceUpdatedAt: price.priceUpdatedAt,
      };
    });
  }
}
