import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { marketplaceApi, storageUrl, Listing, CONDITION_LABELS } from '../../../lib/api/marketplace';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { VerifiedStudentBadge } from '../../../components/ui/VerifiedStudentBadge';
import { useAuth } from '../../../context/AuthContext';

function formatPrice(priceCents: number): string {
  if (priceCents === 0) return 'Free';
  return `€${(priceCents / 100).toFixed(0)}`;
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      marketplaceApi.getListing(id, accessToken ? { accessToken } : undefined),
      marketplaceApi.getCategories(),
    ])
      .then(([l, cats]) => {
        setListing(l);
        setCategoryName(cats.find((c) => c.id === l.categoryId)?.name ?? '');
      })
      .catch(() => setError('Could not load listing.'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleContactSeller() {
    Alert.alert(
      'Contact Seller',
      'In-app messaging is coming soon. For now, reach out through your university channels.',
      [{ text: 'OK' }],
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2e5559" />
      </SafeAreaView>
    );
  }

  if (error || !listing) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50">
        <TouchableOpacity
          className="px-6 pt-6"
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-[13px] font-jakarta-medium text-primary-400">← Back</Text>
        </TouchableOpacity>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm font-jakarta text-neutral-600 text-center">
            {error ?? 'Listing not found.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const firstImage = listing.images[0];

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Back button overlaid on image */}
          <View className="relative">
            {firstImage ? (
              <Image
                source={{ uri: storageUrl(firstImage.s3Key) }}
                className="w-full"
                style={{ height: 280 }}
                resizeMode="cover"
              />
            ) : (
              <View className="w-full bg-neutral-200" style={{ height: 280 }} />
            )}
            <TouchableOpacity
              className="absolute top-4 left-4 bg-neutral-50 rounded-full px-3 py-1.5"
              onPress={() => router.back()}
            >
              <Text className="text-[13px] font-jakarta-medium text-neutral-900">← Back</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="px-6 pt-6 pb-8 gap-4">
            {/* Title + status */}
            <View className="flex-row items-start justify-between gap-3">
              <Text className="text-[20px] font-jakarta-medium text-neutral-900 flex-1">
                {listing.title}
              </Text>
              <StatusBadge status={listing.status} />
            </View>

            {/* Price */}
            <Text className="text-[24px] font-jakarta-medium text-primary-400">
              {formatPrice(listing.priceCents)}
            </Text>

            {/* Meta */}
            <Text className="text-[13px] font-jakarta text-neutral-600">
              {categoryName ? `${categoryName} · ` : ''}{CONDITION_LABELS[listing.condition]}
              {listing.location ? ` · ${listing.location}` : ''}
            </Text>

            {/* Divider */}
            <View className="h-px bg-neutral-200" />

            {/* Description */}
            <Text className="text-[14px] font-jakarta-medium text-neutral-900">Description</Text>
            <Text className="text-[14px] font-jakarta text-neutral-600 leading-relaxed">
              {listing.description}
            </Text>

            {/* Seller — every seller is a verified student (the posting moat),
                so the trust badge always applies. University name awaits a
                backend seller field on the listing payload. */}
            <View className="flex-row items-center gap-2.5">
              <View className="w-9 h-9 rounded-full bg-neutral-200" />
              <View className="gap-1">
                <Text className="text-[13px] font-jakarta-medium text-neutral-800">
                  Listed by a verified student
                </Text>
                <VerifiedStudentBadge variant="verified" size="sm" />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Sticky CTA */}
        <View className="px-6 py-4 bg-neutral-50 border-t border-neutral-200">
          <Button
            label="Contact seller"
            onPress={handleContactSeller}
            disabled={listing.status === 'sold' || listing.status === 'deactivated'}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
