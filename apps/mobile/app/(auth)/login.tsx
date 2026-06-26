import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../lib/api/client';
import { authApi } from '../../lib/api/auth';

interface FormValues {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email';
  }

  if (!values.password) {
    errors.password = 'Password is required';
  }

  return errors;
}

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [values, setValues] = useState<FormValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showResendBanner, setShowResendBanner] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  function setField(field: keyof FormValues) {
    return (text: string) => {
      setValues((prev) => ({ ...prev, [field]: text }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
      if (serverError) setServerError(null);
      if (showResendBanner) setShowResendBanner(false);
    };
  }

  async function handleLogin() {
    const validationErrors = validateForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setServerError(null);
    setShowResendBanner(false);
    try {
      await login(values.email.trim().toLowerCase(), values.password);
      router.replace('/(tabs)');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'EMAIL_NOT_VERIFIED') {
          setShowResendBanner(true);
        } else if (err.code === 'INVALID_CREDENTIALS' || err.status === 401) {
          setServerError('Invalid email or password');
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    setResendLoading(true);
    setResendMessage(null);
    try {
      await authApi.resendVerification(values.email.trim().toLowerCase());
      setResendMessage('Verification email sent — check your inbox.');
    } catch {
      setResendMessage('Could not send email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-8">
            <View className="gap-2 mb-8">
              <Text className="text-[22px] font-jakarta-medium text-neutral-900">
                Welcome back
              </Text>
              <Text className="text-sm font-jakarta text-neutral-600">
                Log in to continue.
              </Text>
            </View>

            {showResendBanner ? (
              <View className="bg-amber-50 border border-amber-200 rounded-[10px] px-4 py-3 mb-4 gap-2">
                <Text className="text-sm font-jakarta text-amber-800">
                  Your email address hasn't been verified yet.
                </Text>
                {resendMessage ? (
                  <Text className="text-sm font-jakarta text-amber-700">{resendMessage}</Text>
                ) : (
                  <TouchableOpacity onPress={handleResendVerification} disabled={resendLoading}>
                    <Text className="text-sm font-jakarta-medium text-primary-400">
                      {resendLoading ? 'Sending…' : 'Resend verification email'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {serverError ? (
              <View className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 mb-4">
                <Text className="text-sm font-jakarta text-red-600">{serverError}</Text>
              </View>
            ) : null}

            <View className="gap-4">
              <FormField
                label="Email"
                placeholder="you@example.com"
                value={values.email}
                onChangeText={setField('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                error={errors.email}
              />
              <FormField
                label="Password"
                placeholder="Enter your password"
                value={values.password}
                onChangeText={setField('password')}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                error={errors.password}
                rightElement={
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text className="text-[13px] font-jakarta text-neutral-600">
                      {showPassword ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                }
              />
            </View>

            <TouchableOpacity
              className="items-end mt-2"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-[13px] font-jakarta-medium text-primary-400">
                Forgot password?
              </Text>
            </TouchableOpacity>

            <View className="mt-6">
              <Button label="Log in" onPress={handleLogin} loading={loading} />
            </View>

            <View className="mt-5 flex-row items-center justify-center gap-1">
              <Text className="text-[13px] font-jakarta text-neutral-600">
                Don't have an account?
              </Text>
              <Link href="/(auth)/signup-account-type" asChild>
                <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text className="text-[13px] font-jakarta-medium text-primary-400">Sign up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
