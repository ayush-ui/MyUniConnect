import { Inject, Injectable } from '@nestjs/common';
import { IUniversityRepository, UNIVERSITY_REPOSITORY } from '../../domain/repositories/university.repository.interface';

export interface UniversityListItem {
  id: string;
  name: string;
}

@Injectable()
export class ListUniversitiesUseCase {
  constructor(
    @Inject(UNIVERSITY_REPOSITORY) private readonly universityRepo: IUniversityRepository,
  ) {}

  async execute(): Promise<UniversityListItem[]> {
    const universities = await this.universityRepo.findAll();
    return universities
      .map((u) => ({ id: u.id, name: u.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
