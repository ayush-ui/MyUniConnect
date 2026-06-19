import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'student@tu-ilmenau.de', description: 'Must be a verified university email address' })
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
}

export class RegisterResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  userId: string;

  @ApiProperty({ example: 'Check your email to verify your account.' })
  message: string;
}
