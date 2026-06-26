import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TokenPayload } from '../../../application/auth/token.service.interface';
import { ForbiddenError } from '../../../domain/errors/app-error';

interface AuthenticatedRequest {
  user?: TokenPayload;
}

/**
 * Gates create/post actions to verified students only. Must run *after* an
 * authentication guard (JwtAuthGuard) that populates `request.user`.
 * Rejects pending students and non-students with 403 STUDENT_VERIFICATION_REQUIRED.
 */
@Injectable()
export class VerifiedStudentGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !user.isVerifiedStudent) {
      throw new ForbiddenError(
        'STUDENT_VERIFICATION_REQUIRED',
        'Only verified students can post. Verify your student status to unlock posting.',
      );
    }

    return true;
  }
}
