
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

async function saveDiscordId() {
    const { data, error } = await supabase.functions.invoke(
        "save-discord-id"
    );

    if (error) {
        console.error("Function error:", error);
        console.error("Function error context:", error.context);
        return;
    }

    console.log("Function response:", data);
}

export default function DiscordLogin() {
    const {
        user,
        loading,
        role,
        isModerator,
        roleLoading,
        discordUsername,
        avatarUrl,
    } = useAuth();

    const [error, setError] = useState<string | null>(null);

    // Keep the Discord ID mapping synchronized after authentication.
    useEffect(() => {
        if (user) {
            void saveDiscordId();
        }
    }, [user?.id]);

    const login = async () => {
        const returnPath = window.location.hash || "#/";

        sessionStorage.setItem("auth-return-path", returnPath);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "discord",
            options: {
                redirectTo: `${window.location.origin}/Playtest64/`,
            },
        });

        if (error) {
            sessionStorage.removeItem("auth-return-path");
            console.error("Discord login failed:", error);
            toast.error(error.message);
        }
    };

    async function logout() {
        setError(null);

        const { error } = await supabase.auth.signOut();

        if (error) {
            setError(error.message);
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Skeleton className="mb-2 h-8 w-2/3" />
                    <Skeleton className="mb-2 h-4 w-1/3" />
                    <Skeleton className="mb-2 h-4 w-1/3" />
                    <Skeleton className="mb-2 h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/3" />
                </CardContent>
            </Card>
        );
    }

    if (!user) {
        return (
            <div className="space-y-2">
                <Button onClick={login} variant="outline">
                    <img
                        src={`${import.meta.env.BASE_URL}assets/discord-icon.svg`}
                        alt=""
                        className="w-[20px]"
                    />
                    Login with Discord
                </Button>

                {error && <p role="alert">{error}</p>}
            </div>
        );
    }

    const metadata = user.user_metadata ?? {};

    const displayName =
        discordUsername ??
        metadata.global_name ??
        metadata.full_name ??
        metadata.name ??
        metadata.user_name ??
        "Discord user";

    const avatar =
        avatarUrl ??
        metadata.avatar_url ??
        metadata.picture ??
        null;

    const roleLabel = roleLoading
        ? "Loading..."
        : isModerator
            ? "Moderator"
            : role ?? "User";

    return (
        <Card>
            <CardContent>
                <div className="space-y-3">
                    {avatar && (
                        <img
                            src={avatar}
                            alt={`${displayName}'s avatar`}
                            className="h-16 w-16 rounded-full"
                        />
                    )}

                    <p className="mb-0">
                        Signed in as <strong>{displayName}</strong>
                    </p>

                    <p>
                        Role:{" "}
                        {roleLoading ? (
                            "Loading..."
                        ) : isModerator ? (
                            <span className="font-bold text-green-500">
                                Moderator
                            </span>
                        ) : (
                            <strong>{roleLabel}</strong>
                        )}
                    </p>

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

