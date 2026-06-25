import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ICategoryRepository } from '../../domain/repositories/category.repository.interface';
import { Category } from '../../domain/entities/category.entity';

@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Category | null> {
    const row = await this.prisma.category.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Category[]> {
    const rows = await this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    return rows.map((r) => this.toDomain(r));
  }

  private toDomain(row: { id: string; name: string; slug: string; createdAt: Date }): Category {
    return { id: row.id, name: row.name, slug: row.slug, createdAt: row.createdAt };
  }
}
