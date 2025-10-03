import { Injectable } from "@nestjs/common";
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
    const skip = (q.page - 1) * q.limit;
    const [total, data] = await this.prisma.$transaction([
      this.prisma.recipe.count({ where }),
      this.prisma.recipe.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: q.limit,
        select: { id: true, title: true, tags: true, createdAt: true },
      }),
    ]);
    return { total, page: q.page, limit: q.limit, data };
  }
}
