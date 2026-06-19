import { Redirect } from 'expo-router';

export default function Index() {
  // TODO: replace with real auth check from AuthContext
  const isAuthenticated = false;
  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />;
}
