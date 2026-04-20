const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const insightCache = new Map<string, CacheEntry<unknown>>();

export function readInsightCache<T>(key: string) {
  const entry = insightCache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    insightCache.delete(key);
    return null;
  }

  return entry.value as T;
}

export function writeInsightCache<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS) {
  insightCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}
