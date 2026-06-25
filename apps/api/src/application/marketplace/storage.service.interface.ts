export interface PresignedUploadResult {
  uploadUrl: string;
  s3Key: string;
}

export interface IStorageService {
  generatePresignedUploadUrl(s3Key: string, contentType: string, expiresInSeconds: number): Promise<string>;
}

export const STORAGE_SERVICE = Symbol('IStorageService');
