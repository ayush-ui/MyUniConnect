import { View, Text } from 'react-native';

export default function RegisterScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-2xl font-bold text-gray-900">Create account</Text>
      <Text className="mt-2 text-gray-500">Join with your university email</Text>
    </View>
  );
}
