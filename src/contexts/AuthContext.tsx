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

  useEffect(() => {
    let mounted = true;

    // Listen for login, logout, and session changes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    // Restore the existing session on page load.
   supabase.auth.getSession().then(({ data, error }) => {
    if (!mounted) return;

    if (error) {
        console.error("Failed to restore auth session:", error.message);
        setUser(null);
        setLoading(false);
        return;
    }

    setUser(data.session?.user ?? null);
    setLoading(false);
}); 

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

    const [role, setRole] = useState<string | null>(null);
    const [roleLoading, setRoleLoading] = useState(true);

    useEffect(() => {
      let active = true;

      async function loadRole() {
        setRoleLoading(true);
        setRole(null);

        if (!user) {
          setRoleLoading(false);
          return;
        }

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

        setRoleLoading(false);
      }

      loadRole();

      return () => {
        active = false;
      };
    }, [user]);

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

