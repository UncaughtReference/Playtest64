
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthContextType = {
    user: User | null;
    loading: boolean;
    role: string | null;
    isModerator: boolean;
    roleLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<string | null>(null);
    const [roleLoading, setRoleLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function restoreSession() {
            try {
                const { data, error } = await supabase.auth.getSession();

                if (!mounted) return;

                if (error) {
                    console.error(
                        "Failed to restore auth session:",
                        error.message
                    );
                    setUser(null);
                } else {
                    setUser(data.session?.user ?? null);
                }
            } catch (error) {
                if (mounted) {
                    console.error("Session restoration failed:", error);
                    setUser(null);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        void restoreSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;

            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        let active = true;

        async function loadRole() {
            setRoleLoading(true);
            setRole(null);

            if (!user) {
                setRoleLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (!active) return;

                if (error) {
                    console.error("Could not load user role:", error.message);
                } else {
                    setRole(data?.role ?? null);
                }
            } catch (error) {
                if (active) {
                    console.error("Could not load user role:", error);
                }
            } finally {
                if (active) {
                    setRoleLoading(false);
                }
            }
        }

        void loadRole();

        return () => {
            active = false;
        };
    }, [user]);

    useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
            if (event === "SIGNED_IN" && session) {
                const returnPath = sessionStorage.getItem("auth-return-path");

                if (returnPath) {
                    sessionStorage.removeItem("auth-return-path");

                    if (window.location.hash !== returnPath) {
                        window.location.hash = returnPath.slice(1);
                    }
                }
            }
        }
    );

    return () => subscription.unsubscribe();
}, []);

    const isModerator = role === "moderator" || role === "admin";

    return (
        <AuthContext.Provider
            value={{ user, loading, role, isModerator, roleLoading }}
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

