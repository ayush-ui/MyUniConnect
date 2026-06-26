import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiCookieAuth,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { RegisterUserUseCase } from '@application/auth/register-user.use-case';
import { VerifyEmailUseCase } from '@application/auth/verify-email.use-case';
import { LoginUseCase } from '@application/auth/login.use-case';
import { RefreshAccessTokenUseCase } from '@application/auth/refresh-token.use-case';
import { LogoutUseCase } from '@application/auth/logout.use-case';
import { GetMeUseCase } from '@application/auth/get-me.use-case';
import { ResendVerificationUseCase } from '@application/auth/resend-verification.use-case';
import { ListUniversitiesUseCase } from '@application/auth/list-universities.use-case';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmailThrottlerGuard } from './guards/email-throttler.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { TokenPayload } from '@application/auth/token.service.interface';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailQueryDto, VerifyEmailResponseDto } from './dto/verify-email.dto';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { MeResponseDto } from './dto/me.dto';
import { UniversityListItemDto } from './dto/university.dto';

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
    private readonly login: LoginUseCase,
    private readonly refreshAccessToken: RefreshAccessTokenUseCase,
    private readonly logout: LogoutUseCase,
    private readonly getMe: GetMeUseCase,
    private readonly resendVerification: ResendVerificationUseCase,
    private readonly listUniversities: ListUniversitiesUseCase,
  ) {}

  @Get('universities')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List partner universities', description: 'Active partner universities, alphabetical. Public — populates the signup university picker.' })
  @ApiResponse({ status: 200, description: 'Partner university list.', type: [UniversityListItemDto] })
  async universities(): Promise<UniversityListItemDto[]> {
    return this.listUniversities.execute();
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new account', description: 'Students (partner university or "Other") and non-students can register. A verification email is sent on success. Domain is never rejected; posting is gated later by verified-student status.' })
  @ApiResponse({ status: 201, description: 'Account created; verification email sent.', type: RegisterResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error (invalid account type / missing university name)' })
  @ApiConflictResponse({ description: 'Email already registered' })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.registerUser.execute({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      accountType: dto.accountType,
      universityId: dto.universityId ?? null,
      claimedUniversityName: dto.claimedUniversityName ?? null,
    });
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address', description: 'Token is extracted from the verification link sent by email.' })
  @ApiQuery({ name: 'token', description: 'The one-time verification token from the email link' })
  @ApiResponse({ status: 200, description: 'Email verified successfully.', type: VerifyEmailResponseDto })
  @ApiBadRequestResponse({ description: 'Token is invalid or has already been used / expired' })
  async verifyEmailHandler(@Query() query: VerifyEmailQueryDto): Promise<VerifyEmailResponseDto> {
    return this.verifyEmail.execute(query.token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EmailThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } })
  @ApiOperation({ summary: 'Resend verification email', description: 'Sends a fresh verification link if the account exists and is not yet verified. Always returns a generic message to avoid email enumeration. Rate limited to 3 requests/hour per email.' })
  @ApiResponse({ status: 200, description: 'Generic acknowledgement (no account information is leaked).' })
  @ApiResponse({ status: 429, description: 'Too many resend requests for this email — try again later.' })
  @ApiBadRequestResponse({ description: 'Invalid email format' })
  async resendVerificationHandler(@Body() dto: ResendVerificationDto): Promise<{ message: string }> {
    return this.resendVerification.execute(dto.email);
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

    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    return { accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Refresh access token', description: 'Rotates the refresh token and issues a new access token. Requires a valid refresh_token cookie.' })
  @ApiResponse({ status: 200, description: 'New access token issued; refresh token rotated in cookie.', type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token is missing, invalid, or expired' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const { accessToken, refreshToken } = await this.refreshAccessToken.execute(rawToken);
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Logout', description: 'Revokes the refresh token and clears the cookie.' })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  async logoutUser(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await this.logout.execute(rawToken);
    res.clearCookie(REFRESH_COOKIE, { path: COOKIE_OPTIONS.path });
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user', description: 'Returns the authenticated user profile. Requires a valid access token.' })
  @ApiResponse({ status: 200, description: 'Current user profile.', type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async me(@CurrentUser() user: TokenPayload): Promise<MeResponseDto> {
    return this.getMe.execute(user.sub);
  }
}
