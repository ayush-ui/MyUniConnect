import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'student@tu-ilmenau.de' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Secure!123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Short-lived JWT access token (15 min)' })
  accessToken: string;
}
