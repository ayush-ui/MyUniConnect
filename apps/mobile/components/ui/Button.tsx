import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  loading?: boolean;
}

export function Button({ label, loading = false, disabled, ...props }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      className={`bg-primary-400 rounded-[10px] px-4 py-3 items-center justify-center ${isDisabled ? 'opacity-60' : ''}`}
      activeOpacity={0.85}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#faf8f5" />
      ) : (
        <Text className="text-base font-jakarta-medium text-neutral-50">{label}</Text>
      )}
    </TouchableOpacity>
  );
}
