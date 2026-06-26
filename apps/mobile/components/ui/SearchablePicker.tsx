import { useMemo, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

export interface PickerItem {
  id: string;
  name: string;
}

interface SearchablePickerProps {
  items: PickerItem[];
  /** Currently selected partner id, or null. */
  selectedId: string | null;
  /** Whether the terminal "Other" option is selected. */
  otherSelected?: boolean;
  onSelect: (id: string) => void;
  onSelectOther?: () => void;
  searchPlaceholder?: string;
  /** Label for the terminal option; omit to hide it. */
  otherLabel?: string;
}

function Row({
  label,
  selected,
  onPress,
  muted,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  muted?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`flex-row items-center justify-between px-4 py-3 ${
        selected ? 'bg-[#dce9ea] border border-primary-400 rounded-[10px]' : 'border-b border-neutral-100'
      }`}
    >
      <Text
        className={`text-sm ${selected ? 'font-jakarta-medium text-primary-400' : muted ? 'font-jakarta text-neutral-600' : 'font-jakarta text-neutral-900'}`}
      >
        {label}
      </Text>
      {selected ? <Text className="text-primary-400 text-sm">✓</Text> : null}
    </TouchableOpacity>
  );
}

export function SearchablePicker({
  items,
  selectedId,
  otherSelected = false,
  onSelect,
  onSelectOther,
  searchPlaceholder = 'Search universities…',
  otherLabel = 'Other (Not listed above)',
}: SearchablePickerProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <View className="gap-2">
      <View className="bg-neutral-50 border border-neutral-200 rounded-[10px]">
        <TextInput
          className="px-4 py-3 text-sm font-jakarta text-neutral-900"
          placeholder={searchPlaceholder}
          placeholderTextColor="#a89f8e"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View>
        {filtered.map((item) => (
          <Row
            key={item.id}
            label={item.name}
            selected={selectedId === item.id}
            onPress={() => onSelect(item.id)}
          />
        ))}
        {onSelectOther ? (
          <Row label={otherLabel} selected={otherSelected} muted onPress={onSelectOther} />
        ) : null}
      </View>
    </View>
  );
}
