import { ApiProperty } from '@nestjs/swagger';

export class UniversityListItemDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'TU Ilmenau' })
  name: string;
}
