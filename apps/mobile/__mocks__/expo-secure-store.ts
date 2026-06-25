// In-memory store simulating expo-secure-store for unit tests
const store: Record<string, string> = {};

export async function getItemAsync(key: string): Promise<string | null> {
  return store[key] ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  store[key] = value;
}

export async function deleteItemAsync(key: string): Promise<void> {
  delete store[key];
}

/** Test helper: reset the store between tests. */
export function __resetStore(): void {
  for (const k of Object.keys(store)) delete store[k];
}
