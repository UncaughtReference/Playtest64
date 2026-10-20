import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

import { LogOut } from "lucide-react"

import { useAuth } from "@/contexts/AuthContext";

import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function DiscordLogin() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

   supabase.auth.getUser().then(({ data, error }) => {
    if (!mounted) return;

    if (error) {
        if (error.name !== "AuthSessionMissingError") {
            console.error("Failed to get user:", error.message);
            setError(error.message);
        }

        setUser(null);
        setLoading(false);
        return;
    }

    setUser(data.user);
    setLoading(false);
}); 

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function login() {
    setError(null);

const { error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
    },
}); 

if (error) {
    console.error("Discord login failed:", error.message);
} 

    if (error) setError(error.message);
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) setError(error.message);
  }

  if (loading) return (
    <Card>
        <CardContent>
            <Skeleton className="h-8 w-2/3 pb-2"/>
            <Skeleton className="h-4 w-1/3"/>
            <Skeleton className="h-4 w-1/3"/>
            <Skeleton className="h-4 w-1/3"/>
            <Skeleton className="h-4 w-1/3"/>
        </CardContent>
    </Card>
  );

  if (!user) {
    return (
      <div className="space-y-2">
        <Button onClick={login} variant="outline">
	  <img src={`${import.meta.env.BASE_URL}assets/discord-icon.svg`} className="w-[20px]"/> 
          Login with Discord
        </Button>
        {error && <p role="alert">{error}</p>}
      </div>
    );
  }

  const metadata = user.user_metadata;
  const displayName =
    metadata.full_name ??
    metadata.name ??
    metadata.custom_claims?.global_name ??
    "Discord user";
  const avatar = metadata.avatar_url ?? metadata.picture;

    const { roleLoading, isModerator } = useAuth(); 
    const roleHtml = isModerator ? 
        (<span className='text-green-500 font-bold'>Moderator</span>) : 
        (<strong>User</strong>);

  return (
    <Card>
        <CardContent>
        <div className="space-y-3">
          {avatar && (
            <img
              src={avatar}
              alt=""
              className="h-16 w-16 rounded-full"
            />
          )}
          <p className="mb-0">Signed in as <strong>{displayName}</strong></p>
          <p>Role: {roleLoading ? "Loading..." : roleHtml ?? "User"}</p>
          <Button variant="outline" onClick={logout}>
        <LogOut />
            Log out
          </Button>
          {error && <p role="alert">{error}</p>}
        </div>
        </CardContent>
    </Card>
  );
}

