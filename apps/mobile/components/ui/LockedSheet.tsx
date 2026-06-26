import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './Button';

interface LockedSheetProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  /** Defaults to "Got it". */
  dismissLabel?: string;
}

/**
 * Bottom-sheet explaining why an action (e.g. posting) is locked. Reused for
 * pending students, non-students, and as the defensive fallback for a 403
 * STUDENT_VERIFICATION_REQUIRED response.
 */
export function LockedSheet({
  visible,
  title,
  message,
  onClose,
  dismissLabel = 'Got it',
}: LockedSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        {/* Stop propagation so taps inside the sheet don't dismiss it. */}
        <Pressable onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={['bottom']} className="bg-neutral-50 rounded-t-[20px]">
            <View className="px-6 pt-3 pb-6 gap-4">
              <View className="self-center h-1 w-10 rounded-full bg-neutral-200" />
              <View className="gap-2">
                <Text className="text-[19px] font-jakarta-medium text-neutral-900">{title}</Text>
                <Text className="text-sm font-jakarta text-neutral-600 leading-5">{message}</Text>
              </View>
              <Button label={dismissLabel} variant="secondary" onPress={onClose} />
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
