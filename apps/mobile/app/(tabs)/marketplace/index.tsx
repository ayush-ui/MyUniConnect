import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { storageUrl, Listing, CONDITION_LABELS } from '../../../lib/api/marketplace';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { LockedSheet } from '../../../components/ui/LockedSheet';
import { useMarketplace } from '../../../hooks/useMarketplace';
import { useAuth } from '../../../context/AuthContext';

/** Copy for the posting-locked sheet, by why-they-can't-post. */
const LOCKED_COPY = {
  pending: {
    title: 'Posting is almost ready',
    message:
      "Your student status is being reviewed. Once verified, you'll be able to create listings. You can browse everything in the meantime.",
  },
  nonStudent: {
    title: "Posting isn't available",
    message: 'Only verified students can create listings. You can browse all listings as a visitor.',
  },
} as const;

function formatPrice(priceCents: number): string {
  if (priceCents === 0) return 'Free';
  return `€${(priceCents / 100).toFixed(0)}`;
}

function ListingCard({
  listing,
  categoryName,
  onPress,
}: {
  listing: Listing;
  categoryName: string;
  onPress: () => void;
}) {
  const firstImage = listing.images[0];

  return (
    <TouchableOpacity
      className="bg-neutral-100 rounded-[14px] overflow-hidden mb-4"
      activeOpacity={0.85}
      onPress={onPress}
    >
      {firstImage ? (
        <Image
          source={{ uri: storageUrl(firstImage.s3Key) }}
          className="w-full h-40"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-40 bg-neutral-200" />
      )}
      <View className="px-4 py-3 gap-1.5">
        <View className="flex-row items-start justify-between">
          <Text className="text-[15px] font-jakarta-medium text-neutral-900 flex-1 mr-2" numberOfLines={1}>
            {listing.title}
          </Text>
          <StatusBadge status={listing.status} />
        </View>
        <Text className="text-[12px] font-jakarta text-neutral-600">
          {categoryName ? `${categoryName} · ` : ''}{CONDITION_LABELS[listing.condition]}
          {listing.location ? ` · ${listing.location}` : ''}
        </Text>
        <Text className="text-[16px] font-jakarta-medium text-primary-400">
          {formatPrice(listing.priceCents)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MarketplaceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [lockedVisible, setLockedVisible] = useState(false);
  const {
    categories,
    listings,
    selectedCategoryId,
    setSelectedCategoryId,
    loading,
    refreshing,
    error,
    refresh,
  } = useMarketplace();

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const canPost = !!user?.isVerifiedStudent;
  const lockedCopy = user?.accountType === 'non_student' ? LOCKED_COPY.nonStudent : LOCKED_COPY.pending;

  function handleCreatePress() {
    if (canPost) {
      router.push('/(tabs)/marketplace/create');
    } else {
      setLockedVisible(true);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pt-8 pb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[22px] font-jakarta-medium text-neutral-900">Marketplace</Text>
            <TouchableOpacity
              className={`rounded-full w-9 h-9 items-center justify-center ${canPost ? 'bg-primary-400' : 'bg-neutral-200'}`}
              onPress={handleCreatePress}
              accessibilityLabel={canPost ? 'Create listing' : 'Posting locked'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className={`text-lg font-jakarta-medium leading-none ${canPost ? 'text-neutral-50' : 'text-neutral-600'}`}>
                +
              </Text>
            </TouchableOpacity>
          </View>

          {/* Category chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <TouchableOpacity
              className={`px-3 py-2 rounded-[6px] ${!selectedCategoryId ? 'bg-primary-400' : 'bg-neutral-100'}`}
              onPress={() => setSelectedCategoryId(null)}
            >
              <Text className={`text-[13px] font-jakarta-medium ${!selectedCategoryId ? 'text-neutral-50' : 'text-neutral-800'}`}>
                All
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                className={`px-3 py-2 rounded-[6px] ${selectedCategoryId === cat.id ? 'bg-primary-400' : 'bg-neutral-100'}`}
                onPress={() => setSelectedCategoryId(cat.id)}
              >
                <Text className={`text-[13px] font-jakarta-medium ${selectedCategoryId === cat.id ? 'text-neutral-50' : 'text-neutral-800'}`}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Listings */}
        {loading && !refreshing ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2e5559" />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-sm font-jakarta text-neutral-600 text-center">{error}</Text>
          </View>
        ) : (
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ListingCard
                listing={item}
                categoryName={categoryMap[item.categoryId] ?? ''}
                onPress={() => router.push(`/(tabs)/marketplace/${item.id}`)}
              />
            )}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#2e5559" />
            }
            ListEmptyComponent={
              <View className="items-center justify-center py-16">
                <Text className="text-sm font-jakarta text-neutral-400 text-center">
                  No listings yet.{'\n'}Be the first to post something!
                </Text>
              </View>
            }
          />
        )}
      </View>

      <LockedSheet
        visible={lockedVisible}
        title={lockedCopy.title}
        message={lockedCopy.message}
        onClose={() => setLockedVisible(false)}
      />
    </SafeAreaView>
  );
}
