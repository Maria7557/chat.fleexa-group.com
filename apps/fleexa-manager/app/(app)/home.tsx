import { getRuntimeConfig } from '@/src/config/runtime';
import { ManagerShell } from '@/src/features/shell/ManagerShell';

export default function HomeRoute() {
  const result = getRuntimeConfig();
  if (!result.ok) return null;
  return <ManagerShell config={result.config} />;
}
