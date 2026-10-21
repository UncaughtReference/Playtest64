import { TabView } from "@/App";
import Header from "@/components/layout/Header";;
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DiscordLogin from "@/components/DiscordLogin";
import { supabase } from "@/lib/supabase";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import { Copy } from "lucide-react";

import {
    getCachedPlaytesters,
    saveCachedPlaytesters,
    clearCachedPlaytesters,
} from "@/lib/playtestersCache";

type PlaytestApplication = {
    hack_name: string;
    owner_id: string;
    applicant_id: string;
    applicant_discord_username: string | null;
    applicant_avatar_url: string | null;
    message: string | null;
    status: string;
};

const filters = ["all", "pending", "approved", "declined"] as const;

type Filter = (typeof filters)[number];

export default function Playtesters() {
  return (
    <main className="mx-auto p-4 flex flex-col animated-gradient min-h-screen">
        <Header></Header>
        <TabView defaultPage="playtesters"></TabView>
    </main>
  );
}

function getSafeCachedApplications(
    userId: string
): PlaytestApplication[] {
    const cached = getCachedPlaytesters<PlaytestApplication[]>(userId);

    return Array.isArray(cached) ? cached : [];
}

export function PlaytestersList() {
    const { user } = useAuth();

    const [applications, setApplications] = useState<PlaytestApplication[]>(
        () => user ? getSafeCachedApplications(user.id) : []
    );

    const [loading, setLoading] = useState(
        () => user
            ? getCachedPlaytesters<PlaytestApplication[]>(user.id) === null
            : false
    ); 

    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>("pending");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    async function copyDiscordUsername(username: string) {
        try {
            await navigator.clipboard.writeText(username);
        } catch (error) {
            console.error("Failed to copy Discord username:", error);
        }
    }

    async function updateApplicationStatus(
        application: PlaytestApplication,
        status: "approved" | "declined"
    ) {
        if (!user || updatingId) {
            return;
        }

        const updateId = application.applicant_id + application.hack_name;

        setUpdatingId(updateId);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from("playtest_applications")
                .update({ status })
                .eq("owner_id", user.id)
                .eq("applicant_id", application.applicant_id)
                .eq("hack_name", application.hack_name);

            if (updateError) {
                throw updateError;
            }

            setApplications((current) => {
                const updated = current.map((item) =>
                    item.applicant_id === application.applicant_id &&
                    item.hack_name === application.hack_name
                        ? { ...item, status }
                        : item
                );

                saveCachedPlaytesters(user.id, updated);

                return updated;
            });
            
            if(status == "approved") {
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

                try {
                    const { data, error } = await supabase
                        .from("hacks")
                        .select("difficulty")
                        .eq("name", application.hack_name)
                        .single();

                    if (error) {
                        throw error; 
                    }

                    let calculatedXp = Math.round(50 + (data.difficulty * 0.25));

                    await addXp(application.applicant_id, calculatedXp);
                } catch (error) {
                    console.error("Failed to award XP:", error);
                }
            }

        } catch (error) {
            console.error("Failed to update application:", error);

            setError(
                error instanceof Error
                    ? `Couldn't update application: ${error.message}`
                    : "Couldn't update application."
            );
        } finally {
            setUpdatingId(null);
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function fetchApplications() {
            if (!user) {
                setApplications([]);
                setLoading(false);
                setError(null);
                return;
            }

            const userId = user.id;
            const cached = getCachedPlaytesters<PlaytestApplication[]>(userId);

            if (Array.isArray(cached)) {
                setApplications(cached);
                setLoading(false);
            } else {
                setApplications([]);
                setLoading(true);
            } 

            setError(null);

            try {
                const { data, error: fetchError } = await supabase
                    .from("playtest_applications")
                    .select(
                        "hack_name, owner_id, applicant_id, applicant_discord_username, applicant_avatar_url, message, status"
                    )
                    .eq("owner_id", userId)
                    .order("hack_name", { ascending: true });

                if (fetchError) {
                    throw fetchError;
                }

                if (cancelled) {
                    return;
                }

                const freshApplications: PlaytestApplication[] = Array.isArray(data)
    ? data as PlaytestApplication[]
    : [];

setApplications(freshApplications);
saveCachedPlaytesters(userId, freshApplications);

            } catch (error) {
                if (cancelled) {
                    return;
                }

                console.error("Failed to fetch playtest applications:", error);

                if (cached === null) {
                    setError("Couldn't load playtest applications.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void fetchApplications();

        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    if (!user) {
        return (
            <div className="p-4">
                <p className="mb-3">
                    Please sign in to view your playtesters!
                </p>
                <DiscordLogin />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="space-y-3 p-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        );
    }

    if (error && applications.length === 0) {
        return (
            <div className="p-4">
                <p className="text-red-500">{error}</p>
                <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => {
                        clearCachedPlaytesters(user.id);
                        setLoading(true);
                        setError(null);
                    }}
                >
                    Clear cache
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4">
            {error && (
                <p className="text-sm text-muted-foreground" role="status">
                    Couldn't refresh applications. Showing cached results.
                </p>
            )}

            <Tabs
                value={filter}
                onValueChange={(value) => setFilter(value as Filter)}
            >
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all">
                        All ({applications.length})
                    </TabsTrigger>
                    <TabsTrigger value="pending">
                        Pending ({
                            applications.filter(
                                (app) => app.status?.toLowerCase() === "pending"
                            ).length
                        })
                    </TabsTrigger>
                    <TabsTrigger value="approved">
                        Approved ({
                            applications.filter(
                                (app) => app.status?.toLowerCase() === "approved"
                            ).length
                        })
                    </TabsTrigger>
                    <TabsTrigger value="declined">
                        Declined ({
                            applications.filter(
                                (app) => app.status?.toLowerCase() === "declined"
                            ).length
                        })
                    </TabsTrigger>
                </TabsList>

                {filters.map((status) => {
                    const items = status === "all"
                        ? applications
                        : applications.filter(
                            (app) => app.status?.toLowerCase() === status
                        );

                    return (
                        <TabsContent key={status} value={status}>
                            {items.length === 0 ? (
                                <p className="py-8 text-center text-muted-foreground">
                                    No {status === "all" ? "" : `${status} `}
                                    applications found.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {items.map((application, index) => {
                                        const applicationId =
                                            application.applicant_id +
                                            application.hack_name;

                                        return (
                                            <Card
                                                key={`${application.applicant_id}-${application.hack_name}-${index}`}
                                            >
                                                <CardHeader>
                                                    <div className="flex items-center gap-3">
                                                        {application.applicant_avatar_url ? (
                                                            <img
                                                                src={application.applicant_avatar_url}
                                                                alt=""
                                                                className="h-12 w-12 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                                                ?
                                                            </div>
                                                        )}

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <CardTitle>
                                                                    {application.applicant_discord_username ||
                                                                        "Unknown applicant"}
                                                                </CardTitle>

                                                                {application.applicant_discord_username && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        title="Copy Discord username"
                                                                        onClick={() =>
                                                                            copyDiscordUsername(
                                                                                application.applicant_discord_username!
                                                                            )
                                                                        }
                                                                    >
                                                                        <Copy className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </div>

                                                            <p className="text-sm text-muted-foreground">
                                                                Hack: {application.hack_name}
                                                            </p>
                                                        </div>

                                                        <span className="rounded-full bg-muted px-3 py-1 text-sm capitalize">
                                                            {application.status}
                                                        </span>
                                                    </div>
                                                </CardHeader>

                                                <CardContent>
                                                    <p className="whitespace-pre-wrap break-words text-sm">
                                                        {application.message ||
                                                            "No message provided."}
                                                    </p>

                                                    {application.status?.toLowerCase() === "pending" && (
                                                        <div className="mt-4 flex flex-wrap gap-2">
                                                            <Button
                                                                disabled={updatingId !== null}
                                                                onClick={() =>
                                                                    updateApplicationStatus(
                                                                        application,
                                                                        "approved"
                                                                    )
                                                                }
                                                            >
                                                                {updatingId === applicationId
                                                                    ? "Updating..."
                                                                    : "Approve"}
                                                            </Button>

                                                            <Button
                                                                variant="destructive"
                                                                disabled={updatingId !== null}
                                                                onClick={() =>
                                                                    updateApplicationStatus(
                                                                        application,
                                                                        "declined"
                                                                    )
                                                                }
                                                            >
                                                                {updatingId === applicationId
                                                                    ? "Updating..."
                                                                    : "Decline"}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </TabsContent>
                    );
                })}
            </Tabs>
        </div>
    );
}

