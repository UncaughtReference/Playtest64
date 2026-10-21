
import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
    clearCachedAccount,
    getCachedAccount,
    saveCachedAccount,
} from "@/lib/accountCache";

type AuthContextType = {
    user: User | null;
    loading: boolean;
    role: string | null;
    isModerator: boolean;
    roleLoading: boolean;
    discordUsername: string | null;
    avatarUrl: string | null;
    cachedIsModerator: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getDiscordAccountDetails(user: User) {
    const metadata = user.user_metadata ?? {};

    const discordUsername =
        metadata.user_name ??
        metadata.preferred_username ??
        metadata.full_name ??
        metadata.name ??
        user.email ??
        "User";

    const avatarUrl =
        metadata.avatar_url ??
        metadata.picture ??
        null;

    return {
        discordUsername:
            typeof discordUsername === "string"
                ? discordUsername
                : "User",
        avatarUrl:
            typeof avatarUrl === "string"
                ? avatarUrl
                : null,
    };
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<string | null>(null);
    const [roleLoading, setRoleLoading] = useState(true);
    const [discordUsername, setDiscordUsername] = useState<string | null>(
        null
    );
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [cachedIsModerator, setCachedIsModerator] = useState(false);

    const currentUserIdRef = useRef<string | null>(null);

    // Restore the session and handle auth changes with one listener.
    useEffect(() => {
        let active = true;

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (!active) {
                return;
            }

            const nextUser = session?.user ?? null;
            const previousUserId = currentUserIdRef.current;

            const signedOut = event === "SIGNED_OUT";
            const switchedAccounts =
                previousUserId !== null &&
                nextUser !== null &&
                previousUserId !== nextUser.id;

            if (signedOut || switchedAccounts || (!nextUser && previousUserId)) {
                clearCachedAccount();
                setRole(null);
                setDiscordUsername(null);
                setAvatarUrl(null);
            }

            currentUserIdRef.current = nextUser?.id ?? null;
            setUser(nextUser);
            setLoading(false);

            // Preserve the destination selected before Discord login.
            if (event === "SIGNED_IN" && session) {
                const returnPath = sessionStorage.getItem(
                    "auth-return-path"
                );

                if (returnPath) {
                    sessionStorage.removeItem("auth-return-path");

                    if (window.location.hash !== returnPath) {
                        window.location.hash = returnPath.slice(1);
                    }
                }
            }
        });

        async function restoreSession() {
            try {
                const { data, error } = await supabase.auth.getSession();

                if (!active) {
                    return;
                }

                if (error) {
                    console.error(
                        "Failed to restore auth session:",
                        error.message
                    );

                    currentUserIdRef.current = null;
                    setUser(null);
                } else {
                    const restoredUser = data.session?.user ?? null;

                    currentUserIdRef.current = restoredUser?.id ?? null;
                    setUser(restoredUser);
                }
            } catch (error) {
                if (active) {
                    console.error("Session restoration failed:", error);
                    currentUserIdRef.current = null;
                    setUser(null);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void restoreSession();

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, []);

    // Show cached account details immediately, then verify them with Supabase.
    useEffect(() => {
        let active = true;

        async function loadAccount() {
            setRoleLoading(true);
            setRole(null);
            setDiscordUsername(null);
            setAvatarUrl(null);

            if (!user) {
                setRoleLoading(false);
                return;
            }

            const cachedAccount = getCachedAccount(user.id);
            const currentDetails = getDiscordAccountDetails(user);

            if (cachedAccount) {
                setDiscordUsername(cachedAccount.discordUsername);
                setAvatarUrl(cachedAccount.avatarUrl);
                setCachedIsModerator(cachedAccount.isModerator);
                // Cached role is display-only while verification is pending.
                setRole(cachedAccount.role);
            } else {
                setDiscordUsername(currentDetails.discordUsername);
                setAvatarUrl(currentDetails.avatarUrl);
                setCachedIsModerator(false);
            }

            try {
                const { data, error } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (!active) {
                    return;
                }

                if (error) {
                    console.error(
                        "Could not load user role:",
                        error.message
                    );

                    // Fail closed if the role cannot be verified.
                    setRole(null);
                    return;
                }

                const verifiedRole = data?.role ?? null;
                const accountDetails = getDiscordAccountDetails(user);

                setRole(verifiedRole);
                setDiscordUsername(accountDetails.discordUsername);
                setAvatarUrl(accountDetails.avatarUrl);

                saveCachedAccount({
                    userId: user.id,
                    discordUsername: accountDetails.discordUsername,
                    avatarUrl: accountDetails.avatarUrl,
                    role: verifiedRole,
                    cachedAt: Date.now(),
                    isModerator:
                        verifiedRole === "moderator" ||
                        verifiedRole === "admin",
                });
            } catch (error) {
                if (active) {
                    console.error("Account loading failed:", error);
                    setRole(null);
                }
            } finally {
                if (active) {
                    setRoleLoading(false);
                }
            }
        }

        void loadAccount();

        return () => {
            active = false;
        };
    }, [user?.id]);

    const isModerator =
        !roleLoading &&
        (role === "moderator" || role === "admin");

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                role,
                isModerator,
                roleLoading,
                discordUsername,
                avatarUrl,
                cachedIsModerator,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
}

