import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'student@tu-ilmenau.de', description: 'University email (enables automatic verification when the domain matches the selected university)' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Secure!123',
    description: 'Min 8 chars, must contain uppercase, number, and special character',
  })
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' })
  password: string;

  @ApiProperty({ example: 'Max' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Muster' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ enum: ['student', 'non_student'], example: 'student', description: 'Whether the account belongs to a student (can become verified + post) or a non-student (browse only).' })
  @IsIn(['student', 'non_student'], { message: 'accountType must be "student" or "non_student"' })
  accountType: 'student' | 'non_student';

  @ApiPropertyOptional({ description: 'Partner university id (from GET /auth/universities) when a student picks one from the list.' })
  @IsOptional()
  @IsUUID()
  universityId?: string;

  @ApiPropertyOptional({ description: 'Free-text university name when a student picks "Other (Not listed)".', example: 'Some Other University' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  claimedUniversityName?: string;
}

export class RegisterResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  userId: string;

  @ApiProperty({ enum: ['student', 'non_student'], example: 'student' })
  accountType: 'student' | 'non_student';

  @ApiProperty({ enum: ['none', 'pending', 'verified', 'rejected'], example: 'pending' })
  studentStatus: 'none' | 'pending' | 'verified' | 'rejected';

  @ApiProperty({ example: 'Check your email to verify your account.' })
  message: string;
}
