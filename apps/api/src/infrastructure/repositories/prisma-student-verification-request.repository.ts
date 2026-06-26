import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateStudentVerificationRequestData,
  IStudentVerificationRequestRepository,
} from '../../domain/repositories/student-verification-request.repository.interface';
import { StudentVerificationRequest } from '../../domain/entities/student-verification-request.entity';

@Injectable()
export class PrismaStudentVerificationRequestRepository
  implements IStudentVerificationRequestRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateStudentVerificationRequestData,
  ): Promise<StudentVerificationRequest> {
    const row = await this.prisma.studentVerificationRequest.create({
      data: {
        userId: data.userId,
        claimedUniversityName: data.claimedUniversityName,
        emailDomain: data.emailDomain,
      },
    });
    return this.toDomain(row);
  }

  private toDomain(row: any): StudentVerificationRequest {
    return {
      id: row.id,
      userId: row.userId,
      claimedUniversityName: row.claimedUniversityName,
      emailDomain: row.emailDomain,
      status: row.status,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt,
      decisionNote: row.decisionNote,
      createdAt: row.createdAt,
    };
  }
}
