import { showErrorToast } from "@/lib/toast";
const CACHE_KEY = "playtest64-mod-hacks";
const CACHE_DURATION = 2 * 60 * 1000;

type CachedData<T> = {
    userId: string;
    data: T;
    cachedAt: number;
};

function getCacheKey(userId: string): string {
    return `${CACHE_KEY}:${userId}`;
}

export function getCachedModHacks<T>(
    userId: string
): T | null {
    try {
        const stored = sessionStorage.getItem(getCacheKey(userId));

        if (!stored) {
            return null;
        }

        const cached: CachedData<T> = JSON.parse(stored);

        if (
            cached.userId !== userId ||
            Date.now() - cached.cachedAt > CACHE_DURATION
        ) {
            sessionStorage.removeItem(getCacheKey(userId));
            return null;
        }

        return cached.data;
    } catch {
        return null;
    }
}

export function saveCachedModHacks<T>(
    userId: string,
    data: T
): void {
    try {
        const cached: CachedData<T> = {
            userId,
            data,
            cachedAt: Date.now(),
        };

        sessionStorage.setItem(
            getCacheKey(userId),
            JSON.stringify(cached)
        );
    } catch {
        showErrorToast("Could not cache moderator hacks.");
    }
}

export function clearCachedModHacks(userId: string): void {
    try {
        sessionStorage.removeItem(getCacheKey(userId));
    } catch {
        showErrorToast("Could not clear moderator hacks cache.");
    }
}
