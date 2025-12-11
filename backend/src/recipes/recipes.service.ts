import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueryRecipeDto } from "./dto/query-recipe.dto";

@Injectable()
export class RecipesService {
  constructor(private prisma: PrismaService) {}

  async create(authorId: string, dto: any) {
    return this.prisma.recipe.create({
      data: {
        authorId,
        title: dto.title,
        description: dto.description,
        steps: dto.steps,
        tags: dto.tags,
        image: dto.image ?? null,
        cookTime: dto.cookTime ?? null,
        items: {
          create: dto.items.map((i) => ({
            ingredientId: i.ingredientId,
            amount: i.amount,
            unitOverride: i.unitOverride,
          })),
        },
      },
      include: { items: true },
    });
  }

  async getById(id: string) {
    return this.prisma.recipe.findUnique({
      where: { id },
      include: {
        items: { include: { ingredient: true } },
        author: { select: { id: true, name: true } },
      },
    });
  }

  async getByAuthorId(authorId: string) {
    return this.prisma.recipe.findMany({
      where: { authorId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        image: true,
        cookTime: true,
        likes: true,
        tags: true,
        createdAt: true,
        totalKcal: true,
      },
    });
  }

  async search(q: QueryRecipeDto) {
    const where: any = {};
    if (q.q) {
      where.OR = [
        { title: { contains: q.q, mode: "insensitive" } },
        { description: { contains: q.q, mode: "insensitive" } },
        { tags: { has: q.q } },
      ];
    }
    if (q.tag) {
      where.tags = { has: q.tag };
    }
    const skip = ((q.page ?? 1) - 1) * (q.limit ?? 10);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.recipe.count({ where }),
      this.prisma.recipe.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: q.limit,
        select: {
          id: true,
          title: true,
          description: true,
          image: true,
          cookTime: true,
          likes: true,
          tags: true,
          createdAt: true,
        },
      }),
    ]);
    return { total, page: q.page, limit: q.limit, data };
  }

  async addFavorite(userId: string, recipeId: string) {
    // Check if recipe exists
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    });
    if (!recipe) {
      throw new NotFoundException("Recipe not found");
    }

    // Check if already favorited
    const existing = await this.prisma.userFavoriteRecipe.findUnique({
      where: { userId_recipeId: { userId, recipeId } },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.userFavoriteRecipe.create({
      data: { userId, recipeId },
      include: {
        recipe: {
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
        },
      },
    });
  }

  async removeFavorite(userId: string, recipeId: string) {
    const favorite = await this.prisma.userFavoriteRecipe.findUnique({
      where: { userId_recipeId: { userId, recipeId } },
    });
    if (!favorite) {
      throw new NotFoundException("Favorite not found");
    }

    await this.prisma.userFavoriteRecipe.delete({
      where: { userId_recipeId: { userId, recipeId } },
    });
    return { deleted: true };
  }

  async getFavorites(userId: string) {
    const favorites = await this.prisma.userFavoriteRecipe.findMany({
      where: { userId },
      include: {
        recipe: {
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
            protein: true,
            fat: true,
            carbs: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return favorites.map((f) => ({
      id: f.id,
      recipe: f.recipe,
      createdAt: f.createdAt,
    }));
  }

  async isFavorite(userId: string, recipeId: string) {
    const favorite = await this.prisma.userFavoriteRecipe.findUnique({
      where: { userId_recipeId: { userId, recipeId } },
    });
    return { isFavorite: !!favorite };
  }
}
