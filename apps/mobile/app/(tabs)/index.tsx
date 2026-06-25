import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1 px-6 pt-8">
        <Text className="text-[22px] font-jakarta-medium text-neutral-900">
          Hey, {user?.firstName} 👋
        </Text>
        <Text className="text-sm font-jakarta text-neutral-600 mt-1">{user?.email}</Text>

        <View className="mt-auto mb-6">
          <TouchableOpacity
            className="border border-neutral-200 rounded-[10px] px-4 py-3 items-center"
            onPress={handleLogout}
          >
            <Text className="text-sm font-jakarta-medium text-neutral-700">Log out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
