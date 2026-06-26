import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { authApi } from '../../lib/api/auth';

type Variant = 'posting' | 'review' | 'browsing';

/** Body copy keyed off the signup path the user took. */
function bodyFor(variant: Variant, emailNode: React.ReactNode): React.ReactNode {
  switch (variant) {
    case 'review':
      return (
        <>
          We sent a verification link to {emailNode}. Your student status is under review — we'll
          notify you once approved. You can browse in the meantime.
        </>
      );
    case 'browsing':
      return <>We sent a verification link to {emailNode}. Verify your email to start browsing.</>;
    case 'posting':
    default:
      return <>We sent a verification link to {emailNode}. Verify your email to start posting.</>;
  }
}

export default function CheckEmailScreen() {
  const { email, variant } = useLocalSearchParams<{ email: string; variant?: Variant }>();
  const router = useRouter();
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const resolvedVariant: Variant =
    variant === 'review' || variant === 'browsing' ? variant : 'posting';

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

  const emailNode = (
    <Text className="font-jakarta-medium text-neutral-800">{email ?? 'your email'}</Text>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1 px-6 items-center justify-center gap-4">
        <View className="h-20 w-20 rounded-full bg-neutral-200" />

        <Text className="text-[22px] font-jakarta-medium text-neutral-900">Check your email</Text>

        <Text className="text-sm font-jakarta text-neutral-600 text-center leading-5">
          {bodyFor(resolvedVariant, emailNode)}
        </Text>

        {resendMessage ? (
          <Text className="text-sm font-jakarta text-neutral-700 text-center">{resendMessage}</Text>
        ) : (
          <TouchableOpacity onPress={handleResend} disabled={resendLoading} className="py-2">
            <Text className="text-sm font-jakarta-medium text-primary-400">
              {resendLoading ? 'Sending…' : "Didn't get it? Resend email"}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity className="py-2" onPress={() => router.replace('/(auth)/login')}>
          <Text className="text-[13px] font-jakarta-medium text-neutral-600">Back to log in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
