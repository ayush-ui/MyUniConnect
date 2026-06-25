import { Text, View } from 'react-native';
import type { ListingStatus } from '../../lib/api/marketplace';

const STATUS_STYLES: Record<ListingStatus, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-success-bg', text: 'text-success-text', label: 'Active' },
  reserved: { bg: 'bg-warning-bg', text: 'text-warning-text', label: 'Reserved' },
  sold: { bg: 'bg-neutral-200', text: 'text-neutral-600', label: 'Sold' },
  deactivated: { bg: 'bg-neutral-200', text: 'text-neutral-600', label: 'Inactive' },
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <View className={`${s.bg} rounded-[6px] px-2 py-1`}>
      <Text className={`text-[11px] font-jakarta-medium ${s.text}`}>{s.label}</Text>
    </View>
  );
}
