import { User } from '../entities/user.entity';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  universityId: string;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  markEmailVerified(userId: string): Promise<void>;
  save(user: User): Promise<User>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
