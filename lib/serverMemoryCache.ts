type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export async function getOrSetMemoryCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<{ value: T; cached: boolean }> {
  const now = Date.now();
  const existing = cache.get(key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > now) {
    return { value: existing.value, cached: true };
  }

  const value = await fetcher();
  cache.set(key, { value, expiresAt: now + ttlMs });
  return { value, cached: false };
}

export function invalidateMemoryCache(key: string): void {
  cache.delete(key);
}
