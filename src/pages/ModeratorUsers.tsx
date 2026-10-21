import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TabView } from "@/App";
import Header from "@/components/layout/Header";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
    getCachedModUsers,
    saveCachedModUsers,
    clearCachedModUsers,
} from "@/lib/modUsersCache";

type ModeratorUser = {
    id: string;
    discord_username: string;
    created_at: string;
    role: string;
    banned_until: string | null;
};

export default function ModeratorUsers() {
  return (
    <main className="mx-auto p-4 flex flex-col animated-gradient min-h-screen">
        <Header></Header>
        <TabView defaultPage="mod-users"></TabView>
    </main>
  );
}

export function ModeratorUsersList() {
    const {
        user,
        loading: authLoading,
        isModerator,
        roleLoading,
    } = useAuth();

    const [users, setUsers] = useState<ModeratorUser[]>([]);
    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    const [userToModerate, setUserToModerate] =
        useState<ModeratorUser | null>(null);

    const [banActionLoading, setBanActionLoading] = useState(false);

    const fetchedForUser = useRef<string | null>(null);

    const invokeModerateUsers = async (body: {
    action: string;
    userId?: string;
}) => {
    const callFunction = async (accessToken: string) =>
        supabase.functions.invoke("moderate-users", {
            body,
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

    const {
        data: { session },
        error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
        throw new Error("Please sign in again.");
    }

    let result = await callFunction(session.access_token);

    if (result.response?.status === 401) {
        const {
            data: { session: refreshedSession },
            error: refreshError,
        } = await supabase.auth.refreshSession();

        if (refreshError || !refreshedSession) {
            throw new Error("Session expired. Please sign in again.");
        }

        result = await callFunction(refreshedSession.access_token);
    }

    return result;
}; 

    const fetchUsers = useCallback(
        async (showLoading = false) => {
            if (!user?.id) {
                return;
            }

            if (showLoading) {
                setLoading(true);
            }

            setError("");

            try {
                const { data, error } = await invokeModerateUsers({
                    action: "list",
                }); 

                if (error) {
                    console.error("moderate-users invocation failed:", error);

                    if (error.context instanceof Response) {
                        console.error("HTTP status:", error.context.status);
                        console.error(
                            "Response body:",
                            await error.context.clone().text()
                        );
                    }

                    throw new Error(error.message);
                } 

                if (data?.error) {
                    throw new Error(data.error);
                }

                const fetchedUsers: ModeratorUser[] = data?.users ?? [];

                // Don't apply a response to a different signed-in account.
                if (fetchedForUser.current !== user.id) {
                    return;
                }

                setUsers(fetchedUsers);
                saveCachedModUsers(user.id, fetchedUsers);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load users."
                );
            } finally {
                setLoading(false);
            }
        },
        [user?.id]
    );

    // Handle sign-out and account switching.
    useEffect(() => {
        const previousUserId = fetchedForUser.current;
        const currentUserId = user?.id ?? null;

        if (previousUserId && previousUserId !== currentUserId) {
            clearCachedModUsers(previousUserId);
            setUsers([]);
            setError("");
        }

        fetchedForUser.current = currentUserId;
    }, [user?.id]);

    // Show cached data immediately, then refresh in the background.
    useEffect(() => {
        if (authLoading || roleLoading) {
            return;
        }

        if (!user || !isModerator) {
            setUsers([]);
            setLoading(false);
            return;
        }

        const cachedUsers = getCachedModUsers<ModeratorUser[]>(user.id);

        if (cachedUsers) {
            setUsers(cachedUsers);
            setLoading(false);
        } else {
            setLoading(true);
        }

        void fetchUsers(!cachedUsers);
    }, [
        authLoading,
        roleLoading,
        user?.id,
        isModerator,
        fetchUsers,
    ]);

    async function toggleBan(target: ModeratorUser) {
        const isBanned =
            target.banned_until !== null &&
            new Date(target.banned_until).getTime() > Date.now();

        const action = isBanned ? "unban" : "ban";

        setBanActionLoading(true);
        setError("");

        try {
            const { data, error } = await invokeModerateUsers({
                    action,
                    userId: target.id,
                }); 

            if (error) {
                throw error;
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            setUserToModerate(null);

            // Fetch fresh ban status and update the cache.
            await fetchUsers();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : `Failed to ${action} user.`
            );
        } finally {
            setBanActionLoading(false);
        }
    }

    if (authLoading || roleLoading) {
        return <p className="p-4">Checking permissions...</p>;
    }

    if (!user || !isModerator) {
        return (
            <p className="text-destructive">
                You don't have permission to view this page.
            </p>
        );
    }

    const filteredUsers = users.filter((item) => {
    const query = (search ?? "").toLowerCase();

    return (
        (item.discord_username ?? "").toLowerCase().includes(query) ||
        (item.id ?? "").toLowerCase().includes(query) ||
        (item.role ?? "").toLowerCase().includes(query)
    );
    }); 

    return (
        <>
            <section className="w-full space-y-4">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="You can search by username, uuid or role okay? okay"
                    className="w-full rounded-md border bg-background px-3 py-2"
                />

                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}

                {loading ? (
                    <p>Loading users...</p>
                ) : filteredUsers.length === 0 ? (
                    <p className="text-muted-foreground">
                        No users found.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {filteredUsers.map((item) => {
                            const isBanned =
                                item.banned_until !== null &&
                                new Date(item.banned_until).getTime() >
                                    Date.now();

                            return (
                                <Card key={item.id}>
                                    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0 space-y-1">
                                            <p className="break-all font-medium">
                                                {item.discord_username}
                                            </p>

                                            <p className="break-all text-xs text-muted-foreground">
                                                {item.id}
                                            </p>

                                            <p className="text-sm text-muted-foreground">
                                                Role: {item.role}
                                            </p>
                                        </div>

                                        <Button
                                            variant="destructive"
                                            disabled={
                                                banActionLoading ||
                                                item.role === "moderator" ||
                                                item.role === "admin"
                                            }
                                            onClick={() => setUserToModerate(item)}
                                        >
                                            {isBanned ? "Unban" : "Ban"}
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {!loading && (
                    <p className="text-sm text-muted-foreground">
                        Showing {filteredUsers.length} of {users.length} users
                    </p>
                )}
            </section>

            <AlertDialog
                open={userToModerate !== null}
                onOpenChange={(open) => {
                    if (!open && !banActionLoading) {
                        setUserToModerate(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {userToModerate?.banned_until &&
                            new Date(userToModerate.banned_until).getTime() >
                                Date.now()
                                ? "Unban this user?"
                                : "Ban this user?"}
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                            Are you sure you want to{" "}
                            {userToModerate?.banned_until &&
                            new Date(userToModerate.banned_until).getTime() >
                                Date.now()
                                ? "unban"
                                : "ban"}{" "}
                            <span className="font-medium">
                                {userToModerate?.discord_username ??
                                    "Unknown Discord user"}
                            </span>
                            ?
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={banActionLoading}>
                            Cancel
                        </AlertDialogCancel>

                        <AlertDialogAction
                            disabled={banActionLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={(event) => {
                                event.preventDefault();

                                if (userToModerate && !banActionLoading) {
                                    void toggleBan(userToModerate);
                                }
                            }}
                        >
                            {banActionLoading
                                ? "Processing..."
                                : userToModerate?.banned_until &&
                                    new Date(
                                        userToModerate.banned_until
                                    ).getTime() > Date.now()
                                  ? "Confirm unban"
                                  : "Confirm ban"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
