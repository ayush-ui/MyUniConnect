import { Injectable, Logger } from '@nestjs/common';
import { IStorageService } from '../../application/marketplace/storage.service.interface';

// TODO [DEBT-008]: Replace with real S3PutObjectCommand + getSignedUrl before going to production
@Injectable()
export class StubStorageService implements IStorageService {
  private readonly logger = new Logger(StubStorageService.name);

  async generatePresignedUploadUrl(s3Key: string, contentType: string, expiresInSeconds: number): Promise<string> {
    const fakeUrl = `https://stub-s3.example.com/${s3Key}?expires=${expiresInSeconds}`;
    this.logger.log(`[STUB] Presigned upload URL for ${s3Key} (${contentType}): ${fakeUrl}`);
    return fakeUrl;
  }
}
