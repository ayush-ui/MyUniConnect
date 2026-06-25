import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { authApi } from '../../lib/api/auth';

export default function CheckEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  async function handleResend() {
    if (!email) return;
    setResendLoading(true);
    setResendMessage(null);
    try {
      await authApi.resendVerification(email);
      setResendMessage('A new link has been sent — check your inbox.');
    } catch {
      setResendMessage('Could not send email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1 px-6 pt-16 gap-6">
        <View className="gap-3">
          <Text className="text-[22px] font-jakarta-medium text-neutral-900">Check your email</Text>
          <Text className="text-sm font-jakarta text-neutral-600">
            We sent a verification link to{' '}
            <Text className="font-jakarta-medium text-neutral-800">{email ?? 'your email'}</Text>.
            {'\n\n'}Open the link to activate your account.
          </Text>
        </View>

        {resendMessage ? (
          <View className="bg-neutral-100 border border-neutral-200 rounded-[10px] px-4 py-3">
            <Text className="text-sm font-jakarta text-neutral-700">{resendMessage}</Text>
          </View>
        ) : null}

        <View className="gap-3 mt-2">
          <Button label="Resend verification email" onPress={handleResend} loading={resendLoading} />
          <TouchableOpacity
            className="items-center py-3"
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text className="text-[13px] font-jakarta-medium text-neutral-600">
              Back to log in
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
