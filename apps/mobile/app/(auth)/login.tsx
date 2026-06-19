import { View, Text } from 'react-native';

export default function LoginScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-2xl font-bold text-gray-900">Welcome back</Text>
      <Text className="mt-2 text-gray-500">Sign in to MyUniConnect</Text>
    </View>
  );
}
