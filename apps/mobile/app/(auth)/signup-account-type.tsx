import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';
import type { AccountType } from '../../lib/api/auth';

interface ChoiceCardProps {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}

function ChoiceCard({ title, subtitle, selected, onPress }: ChoiceCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`rounded-[14px] border px-5 py-4 gap-1 ${
        selected ? 'border-primary-400 bg-[#dce9ea]' : 'border-neutral-200 bg-neutral-50'
      }`}
    >
      <Text className="text-[16px] font-jakarta-medium text-neutral-900">{title}</Text>
      <Text className="text-[13px] font-jakarta text-neutral-600">{subtitle}</Text>
    </TouchableOpacity>
  );
}

export default function SignupAccountTypeScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<AccountType | null>(null);

  function handleContinue() {
    if (!selected) return;
    if (selected === 'student') {
      router.push('/(auth)/signup-university');
    } else {
      router.push({
        pathname: '/(auth)/register',
        params: { accountType: 'non_student' },
      });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1 px-6 pt-8">
        <View className="gap-2 mb-8">
          <Text className="text-[22px] font-jakarta-medium text-neutral-900">
            Create your account
          </Text>
          <Text className="text-sm font-jakarta text-neutral-600">
            Are you signing up as a student or a non-student?
          </Text>
        </View>

        <View className="gap-3">
          <ChoiceCard
            title="I'm a student"
            subtitle="Buy, sell, and post listings. Full access once verified."
            selected={selected === 'student'}
            onPress={() => setSelected('student')}
          />
          <ChoiceCard
            title="I'm not a student"
            subtitle="Browse all listings. Posting is not available."
            selected={selected === 'non_student'}
            onPress={() => setSelected('non_student')}
          />
        </View>

        <View className="mt-8">
          <Button label="Continue" onPress={handleContinue} disabled={!selected} />
        </View>

        <View className="mt-5 flex-row items-center justify-center gap-1">
          <Text className="text-[13px] font-jakarta text-neutral-600">
            Already have an account?
          </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text className="text-[13px] font-jakarta-medium text-primary-400">Log in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
