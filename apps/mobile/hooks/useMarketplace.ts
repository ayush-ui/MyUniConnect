import { useCallback, useEffect, useState } from 'react';
import { marketplaceApi, Category, Listing } from '../lib/api/marketplace';
import { useAuth } from '../context/AuthContext';

interface UseMarketplaceReturn {
  categories: Category[];
  listings: Listing[];
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMarketplace(): UseMarketplaceReturn {
  const { accessToken } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    marketplaceApi.getCategories().then(setCategories).catch(() => {});
  }, []);

  const fetchListings = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        const result = await marketplaceApi.listListings(
          { categoryId: selectedCategoryId ?? undefined },
          accessToken ? { accessToken } : undefined,
        );
        setListings(result.data);
      } catch {
        setError('Could not load listings. Pull down to refresh.');
        setListings([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCategoryId, accessToken],
  );

  useEffect(() => {
    void fetchListings();
  }, [fetchListings]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchListings({ silent: true });
  }, [fetchListings]);

  return {
    categories,
    listings,
    selectedCategoryId,
    setSelectedCategoryId,
    loading,
    refreshing,
    error,
    refresh,
  };
}
