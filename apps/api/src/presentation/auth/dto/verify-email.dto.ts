import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VerifyEmailQueryDto {
  @ApiProperty({ description: 'Verification token from the email link' })
  @IsString()
  @MinLength(1)
  token: string;
}

export class VerifyEmailResponseDto {
  @ApiProperty({ example: 'Email verified successfully.' })
  message: string;
}
