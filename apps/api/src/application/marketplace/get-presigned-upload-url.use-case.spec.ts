import { Test } from '@nestjs/testing';
import { GetPresignedUploadUrlUseCase } from './get-presigned-upload-url.use-case';
import { IStorageService, STORAGE_SERVICE } from './storage.service.interface';
import { ValidationError } from '../../domain/errors/app-error';

function makeStorageService(): jest.Mocked<IStorageService> {
  return {
    generatePresignedUploadUrl: jest.fn().mockResolvedValue('https://s3.example.com/presigned'),
  };
}

async function buildUseCase(storageOverride?: Partial<IStorageService>) {
  const storageService = { ...makeStorageService(), ...storageOverride };
  const module = await Test.createTestingModule({
    providers: [
      GetPresignedUploadUrlUseCase,
      { provide: STORAGE_SERVICE, useValue: storageService },
    ],
  }).compile();
  return { useCase: module.get(GetPresignedUploadUrlUseCase), storageService };
}

describe('GetPresignedUploadUrlUseCase', () => {
  it('returns a presigned URL and s3Key for a valid JPEG', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute({ callerId: 'user-1', fileName: 'photo.jpg', contentType: 'image/jpeg' });
    expect(result.uploadUrl).toBe('https://s3.example.com/presigned');
    expect(result.s3Key).toMatch(/^uploads\/user-1\/.+\.jpg$/);
  });

  it('returns a presigned URL for PNG', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute({ callerId: 'user-1', fileName: 'photo.png', contentType: 'image/png' });
    expect(result.s3Key).toMatch(/\.png$/);
  });

  it('returns a presigned URL for WebP', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute({ callerId: 'user-1', fileName: 'photo.webp', contentType: 'image/webp' });
    expect(result.s3Key).toMatch(/\.webp$/);
  });

  it('throws VALIDATION_ERROR for unsupported content type', async () => {
    const { useCase } = await buildUseCase();
    await expect(
      useCase.execute({ callerId: 'user-1', fileName: 'doc.pdf', contentType: 'application/pdf' }),
    ).rejects.toThrow(ValidationError);
  });

  it('generates a unique s3Key per call', async () => {
    const { useCase } = await buildUseCase();
    const r1 = await useCase.execute({ callerId: 'user-1', fileName: 'a.jpg', contentType: 'image/jpeg' });
    const r2 = await useCase.execute({ callerId: 'user-1', fileName: 'a.jpg', contentType: 'image/jpeg' });
    expect(r1.s3Key).not.toBe(r2.s3Key);
  });
});
