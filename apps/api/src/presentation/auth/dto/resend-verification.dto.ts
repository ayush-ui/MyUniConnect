import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({ example: 'student@tu-ilmenau.de' })
  @IsEmail()
  email: string;
}
