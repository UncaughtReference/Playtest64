type CachedAccount = {
    userId: string;
    discordUsername: string;
    avatarUrl: string | null;
    role: string | null;
    isModerator: boolean;
    cachedAt: number;
};

const CACHE_KEY = "playtest64-account";
const CACHE_DURATION = 5 * 60 * 1000;

export function getCachedAccount(
    userId: string
): CachedAccount | null {
    try {
        const stored = localStorage.getItem(CACHE_KEY);

        if (!stored) {
            return null;
        }

        const account: CachedAccount = JSON.parse(stored);

        if (
            account.userId !== userId ||
            Date.now() - account.cachedAt > CACHE_DURATION
        ) {
            return null;
        }

        return account;
    } catch {
        return null;
    }
}

export function saveCachedAccount(account: CachedAccount) {
    try {
        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
                ...account,
                cachedAt: Date.now(),
            })
        );
    } catch (error) {
        console.error("Could not cache account data:", error);
    }
}

export function clearCachedAccount() {
    localStorage.removeItem(CACHE_KEY);
}
