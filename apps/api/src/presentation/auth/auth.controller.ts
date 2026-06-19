import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { RegisterUserUseCase } from '@application/auth/register-user.use-case';
import { VerifyEmailUseCase } from '@application/auth/verify-email.use-case';
import { LoginUseCase } from '@application/auth/login.use-case';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';
import { VerifyEmailQueryDto, VerifyEmailResponseDto } from './dto/verify-email.dto';
import { LoginDto, LoginResponseDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
    private readonly login: LoginUseCase,
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

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login', description: 'Authenticates a verified student. Returns a JWT access token in the body and sets an httpOnly refresh_token cookie.' })
  @ApiResponse({ status: 200, description: 'Login successful. Access token in body; refresh token in httpOnly cookie.', type: LoginResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or email not verified' })
  @ApiCookieAuth('refresh_token')
  async loginUser(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { accessToken, refreshToken } = await this.login.execute({
      email: dto.email,
      password: dto.password,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    return { accessToken };
  }
}
