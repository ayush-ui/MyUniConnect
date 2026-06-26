import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { SearchablePicker } from '../../components/ui/SearchablePicker';
import { authApi, University } from '../../lib/api/auth';

export default function SignupUniversityScreen() {
  const router = useRouter();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [otherSelected, setOtherSelected] = useState(false);
  const [otherName, setOtherName] = useState('');

  useEffect(() => {
    let active = true;
    authApi
      .universities()
      .then((list) => {
        if (active) setUniversities(list);
      })
      .catch(() => {
        if (active) setLoadError('Could not load universities. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const canContinue = otherSelected ? otherName.trim().length > 0 : selectedId !== null;

  function handleContinue() {
    if (!canContinue) return;
    router.push({
      pathname: '/(auth)/register',
      params: otherSelected
        ? { accountType: 'student', claimedUniversityName: otherName.trim() }
        : { accountType: 'student', universityId: selectedId! },
    });
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
            <View className="gap-2 mb-6">
              <Text className="text-[22px] font-jakarta-medium text-neutral-900">
                Select your university
              </Text>
              <Text className="text-sm font-jakarta text-neutral-600">
                We'll use this to verify your student status.
              </Text>
            </View>

            <Text className="text-[13px] font-jakarta-medium text-neutral-800 mb-2">University</Text>

            {loading ? (
              <View className="py-10 items-center">
                <ActivityIndicator color="#2e5559" />
              </View>
            ) : loadError ? (
              <Text className="text-sm font-jakarta text-red-500 py-4">{loadError}</Text>
            ) : otherSelected ? (
              <View className="gap-4">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setOtherSelected(false)}
                  className="flex-row items-center justify-between px-4 py-3 bg-[#dce9ea] border border-primary-400 rounded-[10px]"
                >
                  <Text className="text-sm font-jakarta-medium text-primary-400">
                    Other (Not listed above)
                  </Text>
                  <Text className="text-primary-400 text-sm">✓</Text>
                </TouchableOpacity>

                <FormField
                  label="Which university do you attend?"
                  placeholder="e.g. University of Stuttgart"
                  value={otherName}
                  onChangeText={setOtherName}
                  autoCapitalize="words"
                />

                <View className="bg-warning-bg rounded-[10px] px-4 py-3">
                  <Text className="text-[13px] font-jakarta text-warning-text leading-5">
                    We'll review and approve your account. You can browse right away — posting
                    unlocks once you're verified.
                  </Text>
                </View>
              </View>
            ) : (
              <SearchablePicker
                items={universities}
                selectedId={selectedId}
                otherSelected={otherSelected}
                onSelect={(id) => {
                  setSelectedId(id);
                  setOtherSelected(false);
                }}
                onSelectOther={() => {
                  setOtherSelected(true);
                  setSelectedId(null);
                }}
              />
            )}

            <View className="mt-8">
              <Button label="Continue" onPress={handleContinue} disabled={!canContinue} />
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
