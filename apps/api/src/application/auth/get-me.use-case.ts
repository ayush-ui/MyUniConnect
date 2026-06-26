import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { IUniversityRepository, UNIVERSITY_REPOSITORY } from '../../domain/repositories/university.repository.interface';
import { NotFoundError } from '../../domain/errors/app-error';
import { AccountType, StudentStatus, UserRole } from '../../domain/entities/user.entity';

export interface MeOutput {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  universityId: string | null;
  role: UserRole;
  emailVerified: boolean;
  accountType: AccountType;
  studentStatus: StudentStatus;
  isVerifiedStudent: boolean;
  university: { id: string; name: string } | null;
  createdAt: Date;
}

@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(UNIVERSITY_REPOSITORY) private readonly universityRepo: IUniversityRepository,
  ) {}

  async execute(userId: string): Promise<MeOutput> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('USER_NOT_FOUND', 'User not found.');
    }

    let university: { id: string; name: string } | null = null;
    if (user.universityId) {
      const uni = await this.universityRepo.findById(user.universityId);
      if (uni) university = { id: uni.id, name: uni.name };
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      universityId: user.universityId,
      role: user.role,
      emailVerified: user.emailVerified,
      accountType: user.accountType,
      studentStatus: user.studentStatus,
      isVerifiedStudent: user.isVerifiedStudent,
      university,
      createdAt: user.createdAt,
    };
  }
}
