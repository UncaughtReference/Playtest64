const CACHE_KEY = "playtest64-approved-hacks";
const CACHE_DURATION = 5 * 60 * 1000;

type CachedHacks<T> = {
    hacks: T;
    cachedAt: number;
};

export function getCachedApprovedHacks<T>(): T | null {
    try {
        const stored = sessionStorage.getItem(CACHE_KEY);

        if (!stored) {
            return null;
        }

        const cached: CachedHacks<T> = JSON.parse(stored);

        if (
            typeof cached.cachedAt !== "number" ||
            Date.now() - cached.cachedAt > CACHE_DURATION ||
            !Array.isArray(cached.hacks)
        ) {
            sessionStorage.removeItem(CACHE_KEY);
            return null;
        }

        return cached.hacks;
    } catch (error) {
        console.error("Could not read approved hacks cache:", error);
        return null;
    }
}

export function saveCachedApprovedHacks<T>(hacks: T): void {
    try {
        if (!Array.isArray(hacks)) {
            return;
        }

        const cached: CachedHacks<T> = {
            hacks,
            cachedAt: Date.now(),
        };

        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch (error) {
        console.error("Could not save approved hacks cache:", error);
    }
}

export function clearCachedApprovedHacks(): void {
    try {
        sessionStorage.removeItem(CACHE_KEY);
    } catch (error) {
        console.error("Could not clear approved hacks cache:", error);
    }
}
