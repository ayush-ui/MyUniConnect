import { useState } from 'react';
import { View, Text, TextInput as RNTextInput, type TextInputProps } from 'react-native';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export function FormField({ label, error, rightElement, ...props }: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  const borderClass = error
    ? 'border-red-400'
    : focused
      ? 'border-primary-400'
      : 'border-neutral-200';

  return (
    <View className="gap-1.5">
      <Text className="text-[13px] font-jakarta-medium text-neutral-800">{label}</Text>
      <View
        className={`flex-row items-center bg-neutral-50 border ${borderClass} rounded-[10px]`}
      >
        <RNTextInput
          className="flex-1 px-4 py-3 text-sm font-jakarta text-neutral-900"
          placeholderTextColor="#a89f8e"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightElement ? <View className="pr-4">{rightElement}</View> : null}
      </View>
      {error ? <Text className="text-xs font-jakarta text-red-500">{error}</Text> : null}
    </View>
  );
}
