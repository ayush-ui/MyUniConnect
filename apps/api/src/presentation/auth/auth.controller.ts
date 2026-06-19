import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBadRequestResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { RegisterUserUseCase } from '@application/auth/register-user.use-case';
import { VerifyEmailUseCase } from '@application/auth/verify-email.use-case';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';
import { VerifyEmailQueryDto, VerifyEmailResponseDto } from './dto/verify-email.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new student account', description: 'Accepts a university email address. A verification email is sent upon success.' })
  @ApiResponse({ status: 201, description: 'Account created; verification email sent.', type: RegisterResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error or unsupported university domain' })
  @ApiConflictResponse({ description: 'Email already registered' })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.registerUser.execute({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address', description: 'Token is extracted from the verification link sent by email.' })
  @ApiQuery({ name: 'token', description: 'The one-time verification token from the email link' })
  @ApiResponse({ status: 200, description: 'Email verified successfully.', type: VerifyEmailResponseDto })
  @ApiBadRequestResponse({ description: 'Token is invalid or has already been used / expired' })
  async verifyEmail(@Query() query: VerifyEmailQueryDto): Promise<VerifyEmailResponseDto> {
    return this.verifyEmail.execute(query.token);
  }
}
