import { Category } from '../entities/category.entity';

export interface ICategoryRepository {
  findById(id: string): Promise<Category | null>;
  findAll(): Promise<Category[]>;
}

export const CATEGORY_REPOSITORY = Symbol('ICategoryRepository');
