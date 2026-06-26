import { StudentVerificationRequest } from '../entities/student-verification-request.entity';

export interface CreateStudentVerificationRequestData {
  userId: string;
  claimedUniversityName: string;
  emailDomain: string;
}

export interface IStudentVerificationRequestRepository {
  create(data: CreateStudentVerificationRequestData): Promise<StudentVerificationRequest>;
}

export const STUDENT_VERIFICATION_REQUEST_REPOSITORY = Symbol('IStudentVerificationRequestRepository');
