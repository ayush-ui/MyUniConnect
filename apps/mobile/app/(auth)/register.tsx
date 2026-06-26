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
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { authApi, AccountType } from '../../lib/api/auth';
import { ApiError } from '../../lib/api/client';

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const PASSWORD_RULES = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

function validateForm(values: FormValues, isStudent: boolean): FormErrors {
  const errors: FormErrors = {};

  if (!values.firstName.trim()) errors.firstName = 'First name is required';
  if (!values.lastName.trim()) errors.lastName = 'Last name is required';

  if (!values.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = isStudent ? 'Enter a valid university email' : 'Enter a valid email';
  }

  if (!values.password) {
    errors.password = 'Password is required';
  } else if (!PASSWORD_RULES.test(values.password)) {
    errors.password = 'Min 8 chars, one uppercase, one number, one special character';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    accountType?: string;
    universityId?: string;
    claimedUniversityName?: string;
  }>();

  const accountType: AccountType = params.accountType === 'non_student' ? 'non_student' : 'student';
  const isStudent = accountType === 'student';

  const [values, setValues] = useState<FormValues>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function setField(field: keyof FormValues) {
    return (text: string) => {
      setValues((prev) => ({ ...prev, [field]: text }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
      if (serverError) setServerError(null);
    };
  }

  async function handleRegister() {
    const validationErrors = validateForm(values, isStudent);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setServerError(null);
    try {
      const result = await authApi.register({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        accountType,
        universityId: params.universityId || undefined,
        claimedUniversityName: params.claimedUniversityName || undefined,
      });
      // Which check-email message to show. Partner-university students take the
      // automated "start posting" path; "Other" students are under review;
      // non-students simply browse. (The backend returns studentStatus=pending
      // for both partner and Other students, so we key off what was selected.)
      const variant =
        result.accountType === 'non_student'
          ? 'browsing'
          : params.claimedUniversityName
            ? 'review'
            : 'posting';
      router.replace({
        pathname: '/(auth)/check-email',
        params: { email: values.email.trim().toLowerCase(), variant },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409 || err.code === 'EMAIL_ALREADY_REGISTERED') {
          setErrors((prev) => ({ ...prev, email: 'This email is already registered' }));
        } else if (err.code === 'WEAK_PASSWORD') {
          setErrors((prev) => ({ ...prev, password: 'Password does not meet requirements' }));
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
                Create your account
              </Text>
              <Text className="text-sm font-jakarta text-neutral-600">
                {isStudent
                  ? 'Use your university email for fast verification.'
                  : 'Create an account to browse listings.'}
              </Text>
            </View>

            {serverError ? (
              <View className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 mb-4">
                <Text className="text-sm font-jakarta text-red-600">{serverError}</Text>
              </View>
            ) : null}

            <View className="gap-4">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <FormField
                    label="First name"
                    placeholder="Max"
                    value={values.firstName}
                    onChangeText={setField('firstName')}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoComplete="given-name"
                    error={errors.firstName}
                  />
                </View>
                <View className="flex-1">
                  <FormField
                    label="Last name"
                    placeholder="Muster"
                    value={values.lastName}
                    onChangeText={setField('lastName')}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoComplete="family-name"
                    error={errors.lastName}
                  />
                </View>
              </View>

              <FormField
                label={isStudent ? 'University email' : 'Email'}
                placeholder={isStudent ? 'student@tu-ilmenau.de' : 'your@email.com'}
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
                placeholder="Min 8 chars, uppercase, number, symbol"
                value={values.password}
                onChangeText={setField('password')}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
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

              <FormField
                label="Confirm password"
                placeholder="Repeat your password"
                value={values.confirmPassword}
                onChangeText={setField('confirmPassword')}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoComplete="new-password"
                error={errors.confirmPassword}
                rightElement={
                  <TouchableOpacity
                    onPress={() => setShowConfirm((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text className="text-[13px] font-jakarta text-neutral-600">
                      {showConfirm ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                }
              />
            </View>

            <View className="mt-6">
              <Button label="Create account" onPress={handleRegister} loading={loading} />
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
