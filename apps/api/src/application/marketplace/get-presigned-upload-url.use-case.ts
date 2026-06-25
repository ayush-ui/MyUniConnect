import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { IStorageService, STORAGE_SERVICE, PresignedUploadResult } from './storage.service.interface';
import { ValidationError } from '../../domain/errors/app-error';

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface GetPresignedUploadUrlInput {
  callerId: string;
  fileName: string;
  contentType: string;
}

@Injectable()
export class GetPresignedUploadUrlUseCase {
  constructor(@Inject(STORAGE_SERVICE) private readonly storage: IStorageService) {}

  async execute(input: GetPresignedUploadUrlInput): Promise<PresignedUploadResult> {
    const ext = ALLOWED_CONTENT_TYPES[input.contentType];
    if (!ext) {
      throw new ValidationError(`Unsupported content type: ${input.contentType}. Allowed: ${Object.keys(ALLOWED_CONTENT_TYPES).join(', ')}`);
    }

    const s3Key = `uploads/${input.callerId}/${crypto.randomUUID()}.${ext}`;
    const uploadUrl = await this.storage.generatePresignedUploadUrl(s3Key, input.contentType, 300);
    return { uploadUrl, s3Key };
  }
}
