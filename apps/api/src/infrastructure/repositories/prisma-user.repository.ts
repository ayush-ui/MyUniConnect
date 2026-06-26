import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IUserRepository, CreateUserData } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    return row ? this.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? this.toDomain(row) : null;
  }

  async create(data: CreateUserData): Promise<User> {
    const row = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        universityId: data.universityId,
        accountType: data.accountType,
        studentStatus: data.studentStatus,
        claimedUniversityName: data.claimedUniversityName ?? null,
      },
    });
    return this.toDomain(row);
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });
  }

  async save(user: User): Promise<User> {
    const row = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email,
        passwordHash: user.passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        universityId: user.universityId,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt,
        accountType: user.accountType,
        studentStatus: user.studentStatus,
        isVerifiedStudent: user.isVerifiedStudent,
        claimedUniversityName: user.claimedUniversityName,
        role: user.role,
        deletedAt: user.deletedAt,
      },
    });
    return this.toDomain(row);
  }

  private toDomain(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      firstName: row.firstName,
      lastName: row.lastName,
      universityId: row.universityId,
      emailVerified: row.emailVerified,
      emailVerifiedAt: row.emailVerifiedAt,
      accountType: row.accountType,
      studentStatus: row.studentStatus,
      isVerifiedStudent: row.isVerifiedStudent,
      claimedUniversityName: row.claimedUniversityName,
      role: row.role,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
