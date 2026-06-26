import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  loading?: boolean;
  /** `primary` is the filled teal button; `secondary` is an outlined button. */
  variant?: 'primary' | 'secondary';
}

export function Button({
  label,
  loading = false,
  disabled,
  variant = 'primary',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const isSecondary = variant === 'secondary';

  const containerClass = isSecondary
    ? 'bg-neutral-50 border border-neutral-200 rounded-[10px] px-4 py-3 items-center justify-center'
    : 'bg-primary-400 rounded-[10px] px-4 py-3 items-center justify-center';
  const textClass = isSecondary
    ? 'text-base font-jakarta-medium text-neutral-800'
    : 'text-base font-jakarta-medium text-neutral-50';

  return (
    <TouchableOpacity
      className={`${containerClass} ${isDisabled ? 'opacity-60' : ''}`}
      activeOpacity={0.85}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? '#2e5559' : '#faf8f5'} />
      ) : (
        <Text className={textClass}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
