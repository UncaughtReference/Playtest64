import { showErrorToast } from "@/lib/toast";
const CACHE_KEY = "playtest64-hacks";
const CACHE_DURATION = 5 * 60 * 1000;

type CachedHacks<T> = {
    hacks: T;
    cachedAt: number;
};

export function getCachedHacks<T>(): T | null {
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
    } catch {
        showErrorToast("Could not read approved hacks cache.");
        return null;
    }
}

export function saveCachedHacks<T>(hacks: T): void {
    try {
        if (!Array.isArray(hacks)) {
            return;
        }

        const cached: CachedHacks<T> = {
            hacks,
            cachedAt: Date.now(),
        };

        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch {
        showErrorToast("Could not save approved hacks cache.");
    }
}

export function clearCachedHacks(): void {
    try {
        sessionStorage.removeItem(CACHE_KEY);
    } catch {
        showErrorToast("Could not clear approved hacks cache.");
    }
}
