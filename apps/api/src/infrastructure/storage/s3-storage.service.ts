import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageService } from '../../application/marketplace/storage.service.interface';

@Injectable()
export class S3StorageService implements IStorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.getOrThrow<string>('S3_BUCKET');

    this.client = new S3Client({
      region: config.get<string>('AWS_REGION') ?? 'us-east-1',
      endpoint: `https://${config.getOrThrow<string>('S3_ENDPOINT')}`,
      credentials: {
        accessKeyId: config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
      // Hetzner Object Storage requires path-style URLs: https://{endpoint}/{bucket}/{key}
      forcePathStyle: true,
    });
  }

  async generatePresignedUploadUrl(
    s3Key: string,
    contentType: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    this.logger.log(`Presigned PUT URL generated for key: ${s3Key}`);
    return url;
  }
}
