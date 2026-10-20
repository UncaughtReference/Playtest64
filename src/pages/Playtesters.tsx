import { Header, TabView } from "@/App";
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

export function PlaytestersList() {
    const { user } = useAuth();
    const [applications, setApplications] = useState<PlaytestApplication[]>([]);
    const [loading, setLoading] = useState(true);
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

        setUpdatingId(application.applicant_id + application.hack_name);
        setError(null);

        const { error: updateError } = await supabase
            .from("playtest_applications")
            .update({ status })
            .eq("owner_id", user.id)
            .eq("applicant_id", application.applicant_id)
            .eq("hack_name", application.hack_name);

        if (updateError) {
            console.error("Failed to update application:", {
                message: updateError.message,
                code: updateError.code,
                details: updateError.details,
                hint: updateError.hint,
            });

            setError(`Couldn't update application: ${updateError.message}`); 
        } else {
            setApplications((current) =>
                current.map((item) =>
                    item.applicant_id === application.applicant_id &&
                    item.hack_name === application.hack_name
                        ? { ...item, status }
                        : item
                )
            );
        }

        setUpdatingId(null);
    }

    useEffect(() => {
        if (!user) {
            setApplications([]);
            setLoading(false);
            return;
        }

        let cancelled = false;

        async function fetchApplications() {
            setLoading(true);
            setError(null);
            
            if (!user) {
                return;
            }

            const { data, error: fetchError } = await supabase
                .from("playtest_applications")
                .select(
                    "hack_name, owner_id, applicant_id, applicant_discord_username, applicant_avatar_url, message, status"
                )
                .eq("owner_id", user.id)
                .order("hack_name", { ascending: true });

            if (cancelled) {
                return;
            }

            if (fetchError) {
                console.error(fetchError);
                setError("Couldn't load playtest applications.");
                setApplications([]);
            } else {
                setApplications(data ?? []);
            }

            setLoading(false);
        }

        fetchApplications();

        return () => {
            cancelled = true;
        };
    }, [user]);

    /*const filteredApplications = useMemo(() => {
        if (filter === "all") {
            return applications;
        }

        return applications.filter(
            (application) =>
                application.status?.toLowerCase() === filter
        );
    }, [applications, filter]);*/

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

    if (error) {
        return <p className="p-4 text-red-500">{error}</p>;
    }

    return (
        <div className="space-y-4 p-4">
            <div>
                <h2 className="text-2xl font-bold">Your Playtesters</h2>
                <p className="text-sm text-muted-foreground">
                    Review and manage applications for your hacks.
                </p>
            </div>

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
                                    {items.map((application, index) => (
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
                                                            {application.applicant_discord_username
                                                                || "Unknown applicant"}
                                                        </CardTitle>

                                                            {application.applicant_discord_username && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title="Copy Discord username"
                                                                    onClick={() =>
                                                                        copyDiscordUsername(application.applicant_discord_username!)
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
                                                    {application.message
                                                        || "No message provided."}
                                                </p>
                                                {application.status?.toLowerCase() === "pending" && (
                                                <div className="mt-4 flex flex-wrap gap-2">
        <Button
            variant="default"
            disabled={updatingId !== null}
            onClick={() => updateApplicationStatus(application, "approved")}
        >
            {updatingId === application.applicant_id + application.hack_name
                ? "Updating..."
                : "Approve"}
        </Button>

        <Button
            variant="destructive"
            disabled={updatingId !== null}
            onClick={() => updateApplicationStatus(application, "declined")}
        >
            {updatingId === application.applicant_id + application.hack_name
                ? "Updating..."
                : "Decline"}
        </Button>
    </div>)}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    );
                })}
            </Tabs>
        </div>
    );
}
