import { Text, View } from 'react-native';
import type { AccountType, StudentStatus } from '../../lib/api/auth';

export type BadgeVariant = 'verified' | 'pending' | 'visitor' | 'none';

/**
 * Maps an account's type/status to a badge variant.
 * - verified student        → "verified"
 * - pending student         → "pending"
 * - non-student             → "visitor"
 * - anything else (e.g. rejected / unverified email) → "none"
 */
export function badgeVariantFor(
  accountType: AccountType | undefined,
  studentStatus: StudentStatus | undefined,
  isVerifiedStudent: boolean | undefined,
): BadgeVariant {
  if (isVerifiedStudent) return 'verified';
  if (accountType === 'student' && studentStatus === 'pending') return 'pending';
  if (accountType === 'non_student') return 'visitor';
  return 'none';
}

interface VerifiedStudentBadgeProps {
  variant: BadgeVariant;
  /** University name appended to the verified badge, e.g. "· TU Ilmenau". */
  universityName?: string | null;
  /** `sm` is the compact listing-card treatment; `md` the profile/detail treatment. */
  size?: 'sm' | 'md';
}

const SIZE = {
  sm: { padX: 'px-2', padY: 'py-0.5', text: 'text-[11px]' },
  md: { padX: 'px-2.5', padY: 'py-1', text: 'text-[12px]' },
} as const;

export function VerifiedStudentBadge({
  variant,
  universityName,
  size = 'md',
}: VerifiedStudentBadgeProps) {
  if (variant === 'none') return null;

  const s = SIZE[size];

  if (variant === 'verified') {
    const label =
      size === 'sm'
        ? '✓ Verified'
        : `✓ Verified student${universityName ? ` · ${universityName}` : ''}`;
    return (
      <View className={`self-start rounded-full bg-[#dce9ea] ${s.padX} ${s.padY}`}>
        <Text className={`font-jakarta-medium text-primary-400 ${s.text}`}>{label}</Text>
      </View>
    );
  }

  if (variant === 'pending') {
    return (
      <View className={`self-start rounded-full bg-warning-bg ${s.padX} ${s.padY}`}>
        <Text className={`font-jakarta-medium text-warning-text ${s.text}`}>
          ⏳ Verification pending
        </Text>
      </View>
    );
  }

  // visitor
  return (
    <View className={`self-start rounded-full bg-neutral-100 ${s.padX} ${s.padY}`}>
      <Text className={`font-jakarta-medium text-neutral-600 ${s.text}`}>Visitor</Text>
    </View>
  );
}
