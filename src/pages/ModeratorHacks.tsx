import { showErrorToast } from "@/lib/toast";
import { TabView } from "@/App";
import Header from "@/components/layout/Header";
import HackCard from "@/components/HackCard";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Hack } from "@/types/hack";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
    clearCachedHacks,
} from "@/lib/hacksCache";
import {
    getCachedModHacks,
    saveCachedModHacks,
} from "@/lib/modHacksCache";
import { pushNotification } from "@/lib/notifications";

export default function ModeratorHacks() {
    return (
        <main className="mx-auto p-4 flex flex-col animated-gradient min-h-screen">
            <Header></Header>
            <TabView defaultPage="mod-hacks"></TabView>
        </main>
    );
}

export function ModeratorHacksGrid() {
    const { user, isModerator, roleLoading } = useAuth();

    const [ hacks, setHacks ] = useState<Hack[]>([]);
    const [ loading, setLoading ] = useState(true);
    const [ error, setError ] = useState("");
    const [ actionLoading, setActionLoading ] =
        useState<string | number | null>(null);

    const [ hackToDecline, setHackToDecline ] = useState<{
        slug: string;
        name: string;
    } | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchHacks() {
            if (roleLoading) {
                return;
            }

            if (!user || !isModerator) {
                setHacks([]);
                setLoading(false);
                return;
            }

            const cachedHacks = getCachedModHacks<Hack[]>(user.id);

            if (cachedHacks) {
                setHacks(cachedHacks);
                setLoading(false);
            } else {
                setLoading(true);
            }

            setError("");

            try {
                const { data, error } = await supabase
                    .from("hacks")
                    .select("*")
                    .eq("status", "pending");

                if (error) {
                    throw error;
                }

                if (!cancelled) {
                    const fetchedHacks: Hack[] = data ?? [];

                    setHacks(fetchedHacks);
                    saveCachedModHacks(user.id, fetchedHacks);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load pending hacks."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void fetchHacks();

        return () => {
            cancelled = true;
        };
    }, [ user?.id, isModerator, roleLoading ]);


    async function updateHackStatus(
        hackName: string,
        hackSlug: string,
        status: "approved" | "declined",
        starCount: number,
        playtimeHours: number,
        playtimeMinutes: number,
        ownerId: string,
    ) {
        if (!user || !isModerator) {
            setError("You don't have permission to review hacks.");
            return;
        }

        setActionLoading(hackSlug);
        setError("");

        try {
            const { data, error } = await supabase.functions.invoke(
                "moderate-hack-status",
                {
                    body: { hackSlug, status },
                }
            );

            if (error) {
                throw error;
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            if (!data?.hack) {
                throw new Error("The hack status could not be confirmed.");
            }

            if (status === "approved" && !data.notificationSent) {
                setError(
                    "Hack approved, but the Discord notification could not be sent."
                );
            }

            setHacks((current) => {
                const updated = current.filter(
                    (hack) => hack.slug !== hackSlug
                );

                saveCachedModHacks(user.id, updated);

                return updated;
            });
            
            let message = "Error";
            if(status === "approved") message = `Your hack ${hackName} has been approved! Congrats!`;
            else message = `Your hack ${hackName} has been declined... You may appeal this decision in our Discord server.`;

            await pushNotification({
                toUser: ownerId,
                message: message,
            });

            async function addXp(userId: string, amount: number): Promise<number> {
                const { data, error } = await supabase.rpc("add_xp", {
                    amount: amount,
                    target_user_id: userId,
                });

                if (error) {
                    throw error;
                }

                return data as number;
            }

            let calculatedXp = Math.round(100 + (starCount + (playtimeHours * 30 + playtimeMinutes * 0.5)));

            if(status === "approved") {
                try {
                    await addXp(ownerId, calculatedXp);
                } catch {
                    showErrorToast("Failed to award XP.");
                }
            }

            clearCachedHacks();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to update hack status."
            );
        } finally {
            setActionLoading(null);
        }
    }


    if (roleLoading) {
        return <div>Loading permissions...</div>;
    }

    if (!user || !isModerator) {
        return <p>You don't have permission to review hacks.</p>;
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="space-y-3 pt-6">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="aspect-video w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error && hacks.length === 0) {
        return <p role="alert">Error: {error}</p>;
    }

    if (hacks.length === 0) {
        return (
            <>
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
                <p className="text-green-500 font-bold">There are no pending hacks to review! GG!</p>
            </>
        );
    }

    return (
        <>
            <div className="space-y-4">
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}

                <p>Yell at me if any hacks have typos or invalid values or smth</p>

                {hacks.map((hack) => (
                    <HackCard
                        key={hack.slug}
                        hack={hack}
                        onApprove={() =>
                            updateHackStatus(hack.name, hack.slug, "approved", hack.star_count, hack.playtime_hours, hack.playtime_minutes, hack.owner_id)
                        }
                        onDecline={() =>
                            setHackToDecline({
                                slug: hack.slug,
                                name: hack.name,
                            })
                        }
                        actionLoading={actionLoading === hack.slug}
                    />
                ))}
            </div>

            <AlertDialog
                open={hackToDecline !== null}
                onOpenChange={(open) => {
                    if (!open && actionLoading === null) {
                        setHackToDecline(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Are you sure you want to decline this hack?
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                            {hackToDecline
                                ? `You are about to decline "${hackToDecline.name}". The hack will be removed from the pending list.`
                                : ""}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading !== null}>
                            Cancel
                        </AlertDialogCancel>

                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={actionLoading !== null}
                            onClick={(event) => {
                                event.preventDefault();

                                if (
                                    hackToDecline &&
                                    actionLoading === null
                                ) {
                                    void updateHackStatus(
                                        hackToDecline.name,
                                        hackToDecline.slug,
                                        "declined", 0, 0, 0, ""
                                    ).then(() => {
                                        setHackToDecline(null);
                                    });
                                }
                            }}
                        >
                            {actionLoading !== null
                                ? "Processing..."
                                : "Decline hack"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
