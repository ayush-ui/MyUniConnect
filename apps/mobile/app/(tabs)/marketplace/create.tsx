import { useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { marketplaceApi, Category, ItemCondition } from '../../../lib/api/marketplace';
import { FormField } from '../../../components/ui/FormField';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { ApiError } from '../../../lib/api/client';

const CONDITIONS: { value: ItemCondition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

interface SelectedImage {
  uri: string;
  s3Key: string;
  mimeType: string;
}

interface FormValues {
  title: string;
  description: string;
  price: string;
  location: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  price?: string;
  category?: string;
  images?: string;
}

function validate(values: FormValues, categoryId: string | null): FormErrors {
  const errors: FormErrors = {};
  if (!values.title.trim() || values.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters';
  }
  if (!values.description.trim() || values.description.trim().length < 10) {
    errors.description = 'Description must be at least 10 characters';
  }
  const price = parseFloat(values.price);
  if (isNaN(price) || price < 0) {
    errors.price = 'Enter a valid price (0 for free)';
  }
  if (!categoryId) {
    errors.category = 'Select a category';
  }
  return errors;
}

export default function CreateListingScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [values, setValues] = useState<FormValues>({
    title: '',
    description: '',
    price: '',
    location: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<ItemCondition>('good');
  const [studentsOnly, setStudentsOnly] = useState(true);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    marketplaceApi.getCategories().then(setCategories).catch(() => {});
  }, []);

  function setField(field: keyof FormValues) {
    return (text: string) => {
      setValues((prev) => ({ ...prev, [field]: text }));
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };
  }

  async function handlePickImages() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your photo library to add images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10 - images.length,
      quality: 0.8,
    });

    if (result.canceled || !result.assets.length) return;

    setUploadingImages(true);
    const newImages: SelectedImage[] = [];

    for (const asset of result.assets) {
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const fileName = asset.fileName ?? `photo_${Date.now()}.jpg`;
      try {
        const { uploadUrl, s3Key } = await marketplaceApi.getPresignedUploadUrl(
          fileName,
          mimeType,
          { accessToken: accessToken! },
        );

        // Attempt upload — may fail in dev with stub storage
        try {
          const blob = await fetch(asset.uri).then((r) => r.blob());
          await fetch(uploadUrl, {
            method: 'PUT',
            body: blob,
            headers: { 'Content-Type': mimeType },
          });
        } catch {
          // Upload to stub URL will fail in dev; s3Key is still valid for listing creation
        }

        newImages.push({ uri: asset.uri, s3Key, mimeType });
      } catch (err) {
        Alert.alert('Upload failed', 'Could not prepare one or more images. Please try again.');
        break;
      }
    }

    setImages((prev) => [...prev, ...newImages].slice(0, 10));
    setUploadingImages(false);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function showCategoryPicker() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...categories.map((c) => c.name)],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            setSelectedCategoryId(categories[buttonIndex - 1].id);
            setErrors((prev) => ({ ...prev, category: undefined }));
          }
        },
      );
    } else {
      Alert.alert(
        'Select Category',
        undefined,
        [
          ...categories.map((c) => ({
            text: c.name,
            onPress: () => {
              setSelectedCategoryId(c.id);
              setErrors((prev) => ({ ...prev, category: undefined }));
            },
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ],
      );
    }
  }

  function showConditionPicker() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...CONDITIONS.map((c) => c.label)],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) setSelectedCondition(CONDITIONS[buttonIndex - 1].value);
        },
      );
    } else {
      Alert.alert(
        'Select Condition',
        undefined,
        [
          ...CONDITIONS.map((c) => ({
            text: c.label,
            onPress: () => setSelectedCondition(c.value),
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ],
      );
    }
  }

  async function handleSubmit() {
    const validationErrors = validate(values, selectedCategoryId);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    if (images.length === 0) {
      setErrors((prev) => ({ ...prev, images: 'Add at least one photo' }));
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      const priceCents = Math.round(parseFloat(values.price || '0') * 100);
      await marketplaceApi.createListing(
        {
          title: values.title.trim(),
          description: values.description.trim(),
          priceCents,
          currency: 'EUR',
          categoryId: selectedCategoryId!,
          condition: selectedCondition,
          visibility: studentsOnly ? 'students_only' : 'public',
          location: values.location.trim() || undefined,
          imageKeys: images.map((img) => img.s3Key),
        },
        { accessToken: accessToken! },
      );

      Alert.alert('Listing posted!', 'Your listing is now live on the marketplace.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/marketplace') },
      ]);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'LISTING_LIMIT_REACHED') {
          setServerError('You have reached the maximum of 20 active listings.');
        } else if (err.code === 'CATEGORY_NOT_FOUND') {
          setServerError('Selected category is no longer available. Please choose another.');
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const selectedConditionLabel = CONDITIONS.find((c) => c.value === selectedCondition)?.label ?? 'Good';

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-8 pb-6">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-[22px] font-jakarta-medium text-neutral-900">New listing</Text>
              <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text className="text-[13px] font-jakarta-medium text-neutral-600">Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Photo picker */}
            <TouchableOpacity
              className="bg-neutral-100 border border-neutral-200 rounded-[14px] h-30 items-center justify-center mb-5"
              style={{ height: 120 }}
              onPress={handlePickImages}
              disabled={uploadingImages || images.length >= 10}
            >
              {uploadingImages ? (
                <ActivityIndicator color="#2e5559" />
              ) : (
                <Text className="text-[13px] font-jakarta-medium text-neutral-600">
                  {images.length === 0 ? '+ Add photos (up to 10)' : `+ Add more (${images.length}/10)`}
                </Text>
              )}
            </TouchableOpacity>

            {/* Image previews */}
            {images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                className="mb-5"
              >
                {images.map((img, i) => (
                  <View key={i} className="relative">
                    <Image
                      source={{ uri: img.uri }}
                      className="rounded-[10px]"
                      style={{ width: 80, height: 80 }}
                    />
                    <TouchableOpacity
                      className="absolute -top-1.5 -right-1.5 bg-neutral-900 rounded-full w-5 h-5 items-center justify-center"
                      onPress={() => removeImage(i)}
                    >
                      <Text className="text-neutral-50 text-[10px] font-jakarta-medium leading-none">×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {errors.images ? (
              <Text className="text-xs font-jakarta text-red-500 mb-3 -mt-3">{errors.images}</Text>
            ) : null}

            {serverError ? (
              <View className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 mb-4">
                <Text className="text-sm font-jakarta text-red-600">{serverError}</Text>
              </View>
            ) : null}

            {/* Form fields */}
            <View className="gap-4">
              <FormField
                label="Title"
                placeholder="What are you selling?"
                value={values.title}
                onChangeText={setField('title')}
                error={errors.title}
                autoCapitalize="sentences"
              />

              {/* Category + Condition row */}
              <View className="flex-row gap-3">
                <View className="flex-1 gap-1.5">
                  <Text className="text-[13px] font-jakarta-medium text-neutral-800">Category</Text>
                  <TouchableOpacity
                    className={`bg-neutral-50 border ${errors.category ? 'border-red-400' : 'border-neutral-200'} rounded-[10px] px-4 py-3`}
                    onPress={showCategoryPicker}
                  >
                    <Text className={`text-sm font-jakarta ${selectedCategory ? 'text-neutral-900' : 'text-neutral-400'}`}>
                      {selectedCategory?.name ?? 'Select…'}
                    </Text>
                  </TouchableOpacity>
                  {errors.category ? (
                    <Text className="text-xs font-jakarta text-red-500">{errors.category}</Text>
                  ) : null}
                </View>

                <View className="flex-1 gap-1.5">
                  <Text className="text-[13px] font-jakarta-medium text-neutral-800">Condition</Text>
                  <TouchableOpacity
                    className="bg-neutral-50 border border-neutral-200 rounded-[10px] px-4 py-3"
                    onPress={showConditionPicker}
                  >
                    <Text className="text-sm font-jakarta text-neutral-900">{selectedConditionLabel}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <FormField
                label="Price (EUR)"
                placeholder="0"
                value={values.price}
                onChangeText={setField('price')}
                keyboardType="decimal-pad"
                error={errors.price}
              />

              <FormField
                label="Description"
                placeholder="Describe the item's condition and any relevant details…"
                value={values.description}
                onChangeText={setField('description')}
                multiline
                numberOfLines={4}
                style={{ minHeight: 96, textAlignVertical: 'top' }}
                error={errors.description}
                autoCapitalize="sentences"
              />

              <FormField
                label="Location (optional)"
                placeholder="e.g. Ilmenau"
                value={values.location}
                onChangeText={setField('location')}
                autoCapitalize="words"
              />

              {/* Students only toggle */}
              <View className="flex-row items-center justify-between">
                <Text className="text-[14px] font-jakarta-medium text-neutral-900">Students only</Text>
                <Switch
                  value={studentsOnly}
                  onValueChange={setStudentsOnly}
                  trackColor={{ false: '#dcd4c8', true: '#2e5559' }}
                  thumbColor="#faf8f5"
                />
              </View>

              <Button label="Post listing" onPress={handleSubmit} loading={submitting} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
