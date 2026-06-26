import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IUniversityRepository } from '../../domain/repositories/university.repository.interface';
import { University } from '../../domain/entities/university.entity';

@Injectable()
export class PrismaUniversityRepository implements IUniversityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<University | null> {
    const row = await this.prisma.university.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByDomain(domain: string): Promise<University | null> {
    const row = await this.prisma.university.findUnique({ where: { emailDomain: domain } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<University[]> {
    const rows = await this.prisma.university.findMany({ where: { active: true } });
    return rows.map((r) => this.toDomain(r));
  }

  private toDomain(row: any): University {
    return {
      id: row.id,
      name: row.name,
      emailDomain: row.emailDomain,
      country: row.country,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
