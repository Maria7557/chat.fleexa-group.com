import { getRuntimeConfig } from '@/src/config/runtime';
import { LoginScreen } from '@/src/features/login/LoginScreen';

export default function LoginRoute() {
  const result = getRuntimeConfig();
  if (!result.ok) return null;
  return <LoginScreen config={result.config} />;
}
