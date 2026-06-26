import { University } from '../entities/university.entity';

export interface IUniversityRepository {
  findById(id: string): Promise<University | null>;
  findByDomain(domain: string): Promise<University | null>;
  findAll(): Promise<University[]>;
}

export const UNIVERSITY_REPOSITORY = Symbol('IUniversityRepository');
