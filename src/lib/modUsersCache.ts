const CACHE_KEY = "playtest64-mod-users";
const CACHE_DURATION = 2 * 60 * 1000;

type CachedData<T> = {
    userId: string;
    data: T;
    cachedAt: number;
};

function getCacheKey(userId: string): string {
    return `${CACHE_KEY}:${userId}`;
}

export function getCachedModUsers<T>(
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

export function saveCachedModUsers<T>(
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
    } catch (error) {
        console.error("Could not cache moderator users:", error);
    }
}

export function clearCachedModUsers(userId: string): void {
    try {
        sessionStorage.removeItem(getCacheKey(userId));
    } catch (error) {
        console.error("Could not clear moderator users cache:", error);
    }
}
