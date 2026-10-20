const CACHE_KEY = "playtest64-playtesters";
const CACHE_DURATION = 2 * 60 * 1000;

type CachedData<T> = {
    userId: string;
    data: T;
    cachedAt: number;
};

function getUserCacheKey(userId: string): string {
    return `${CACHE_KEY}:${userId}`;
}

export function getCachedPlaytesters<T>(
    userId: string
): T | null {
    try {
        const key = getUserCacheKey(userId);
        const stored = sessionStorage.getItem(key);

        if (!stored) {
            return null;
        }

        const cached: CachedData<unknown> = JSON.parse(stored);

        if (
            cached.userId !== userId ||
            typeof cached.cachedAt !== "number" ||
            Date.now() - cached.cachedAt > CACHE_DURATION ||
            !Array.isArray(cached.data)
        ) {
            sessionStorage.removeItem(key);
            return null;
        }

        return cached.data as T;
    } catch (error) {
        console.error("Could not read playtesters cache:", error);
        return null;
    }
}

export function saveCachedPlaytesters<T>(
    userId: string,
    data: T
): void {
    try {
        if (!Array.isArray(data)) {
            return;
        }

        const cached: CachedData<T> = {
            userId,
            data,
            cachedAt: Date.now(),
        };

        sessionStorage.setItem(
            getUserCacheKey(userId),
            JSON.stringify(cached)
        );
    } catch (error) {
        console.error("Could not save playtesters cache:", error);
    }
}

export function clearCachedPlaytesters(userId: string): void {
    try {
        sessionStorage.removeItem(getUserCacheKey(userId));
    } catch (error) {
        console.error("Could not clear playtesters cache:", error);
    }
}
