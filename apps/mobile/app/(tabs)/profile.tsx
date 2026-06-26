import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { VerifiedStudentBadge, badgeVariantFor } from '../../components/ui/VerifiedStudentBadge';

function MenuRow({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className="py-4 border-b border-neutral-100"
    >
      <Text className="text-[15px] font-jakarta text-neutral-900">{label}</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const variant = badgeVariantFor(
    user?.accountType,
    user?.studentStatus,
    user?.isVerifiedStudent,
  );
  const isPending = variant === 'pending';
  const universityName = user?.university?.name ?? user?.claimedUniversityName ?? null;
  const subtitle = [universityName, user?.email].filter(Boolean).join(' · ');

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1 px-6 pt-8">
        <Text className="text-[22px] font-jakarta-medium text-neutral-900 mb-6">Profile</Text>

        {/* Identity card */}
        <View className="flex-row items-center gap-4 mb-6">
          <View className="h-16 w-16 rounded-full bg-neutral-200" />
          <View className="flex-1 gap-1">
            <Text className="text-[17px] font-jakarta-medium text-neutral-900">
              {user ? `${user.firstName} ${user.lastName}` : 'Account'}
            </Text>
            {subtitle ? (
              <Text className="text-[13px] font-jakarta text-neutral-600">{subtitle}</Text>
            ) : null}
            <View className="mt-1">
              <VerifiedStudentBadge variant={variant} universityName={universityName} />
            </View>
          </View>
        </View>

        {/* Pending "under review" panel */}
        {isPending ? (
          <View className="bg-warning-bg rounded-[12px] px-4 py-3 mb-6 gap-1">
            <Text className="text-[15px] font-jakarta-medium text-warning-text">
              Verification under review
            </Text>
            <Text className="text-[13px] font-jakarta text-warning-text leading-5">
              We're reviewing your student status. You can browse listings — posting unlocks once
              you're verified.
            </Text>
            {/* Space reserved for a future "Request verification" action (CMS). */}
          </View>
        ) : null}

        {/* Menu */}
        <View>
          {user?.isVerifiedStudent ? (
            <MenuRow label="My listings" onPress={() => router.push('/(tabs)/marketplace')} />
          ) : null}
          <MenuRow label="Settings" />
          <MenuRow label="Help & support" />
        </View>

        <View className="mt-auto mb-6">
          <Button label="Log out" variant="secondary" onPress={handleLogout} />
        </View>
      </View>
    </SafeAreaView>
  );
}
