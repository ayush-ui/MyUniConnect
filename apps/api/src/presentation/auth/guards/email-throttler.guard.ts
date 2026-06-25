import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate-limits by the email in the request body rather than by IP, so a single
 * account cannot be spammed with verification emails regardless of source IP.
 * Used on POST /auth/resend-verification (EPIC-001 UC-1.3: max 3/hour per email).
 */
@Injectable()
export class EmailThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    // Fall back to IP when no email is supplied (e.g. malformed request).
    return email || req.ip;
  }
}
