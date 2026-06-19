import { ApiProperty } from '@nestjs/swagger';

export class MeResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() universityId: string;
  @ApiProperty() role: string;
  @ApiProperty() emailVerified: boolean;
  @ApiProperty() createdAt: Date;
}
