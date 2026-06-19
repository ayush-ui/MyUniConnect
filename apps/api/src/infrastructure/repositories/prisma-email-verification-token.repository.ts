import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  IEmailVerificationTokenRepository,
  EmailVerificationToken,
} from '../../domain/repositories/email-verification-token.repository.interface';

@Injectable()
export class PrismaEmailVerificationTokenRepository implements IEmailVerificationTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<EmailVerificationToken> {
    const row = await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    });
    return this.toDomain(row);
  }

  async findUnusedByHash(tokenHash: string): Promise<EmailVerificationToken | null> {
    const row = await this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async findValidByUserId(userId: string): Promise<EmailVerificationToken | null> {
    const row = await this.prisma.emailVerificationToken.findFirst({
      where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.toDomain(row) : null;
  }

  async markUsed(tokenId: string): Promise<void> {
    await this.prisma.emailVerificationToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  private toDomain(row: any): EmailVerificationToken {
    return {
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
    };
  }
}
