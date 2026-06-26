import { ApiProperty } from '@nestjs/swagger';

export class MeUniversityDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
}

export class MeResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty({ nullable: true }) universityId: string | null;
  @ApiProperty() role: string;
  @ApiProperty() emailVerified: boolean;
  @ApiProperty({ enum: ['student', 'non_student'] }) accountType: string;
  @ApiProperty({ enum: ['none', 'pending', 'verified', 'rejected'] }) studentStatus: string;
  @ApiProperty({ description: 'Derived gate for posting (student & verified & email-verified).' })
  isVerifiedStudent: boolean;
  @ApiProperty({ type: MeUniversityDto, nullable: true }) university: MeUniversityDto | null;
  @ApiProperty({ nullable: true, description: 'Free-text university from the "Other" path (pending students).' })
  claimedUniversityName: string | null;
  @ApiProperty() createdAt: Date;
}
