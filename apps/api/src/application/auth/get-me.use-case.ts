import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { NotFoundError } from '../../domain/errors/app-error';
import { UserRole } from '../../domain/entities/user.entity';

export interface MeOutput {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  universityId: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
}

@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(userId: string): Promise<MeOutput> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('USER_NOT_FOUND', 'User not found.');
    }
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      universityId: user.universityId,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}
