import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ITokenService, TOKEN_SERVICE, TokenPayload } from '../../../application/auth/token.service.interface';

interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: TokenPayload;
}

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers['authorization'] as string | undefined;

    if (!authHeader?.startsWith('Bearer ')) {
      return true;
    }

    try {
      request.user = this.tokenService.verifyAccessToken(authHeader.slice(7));
    } catch {
      // Expired or invalid — treat as anonymous, never block the request
    }
    return true;
  }
}
