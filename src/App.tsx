//SHADCN IMPORTS----------------------------------------------------------------
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Toaster } from "@/components/ui/toast"
import { showErrorToast } from "@/lib/toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
//SHADCN IMPORTS----------------------------------------------------------------

//LUCIDE REACT IMPORTS----------------------------------------------------------
import { ArrowLeftIcon, Gamepad2, CirclePlus, House, User, Monitor, Play, Shield, 
    Users, Tags, Flame, Star, Timer, Copy } from "lucide-react"
//LUCIDE REACT IMPORTS----------------------------------------------------------

//REACT IMPORTS-----------------------------------------------------------------
import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";

//LIB IMPORTS-------------------------------------------------------------------
import { supabase } from "@/lib/supabase";
import {
    getCachedHacks,
    saveCachedHacks,
    clearCachedHacks,
} from "@/lib/hacksCache";
import { clearCachedModHacks } from "@/lib/modHacksCache";
import { pushNotification } from "@/lib/notifications";
//LIB IMPORTS-------------------------------------------------------------------

//REACT ROUTER IMPORTS----------------------------------------------------------
import { Routes, Route } from "react-router-dom";
import { useParams, useLocation, useNavigate } from "react-router-dom";
//REACT ROUTER IMPORTS----------------------------------------------------------

//COMPONENT IMPORTS-------------------------------------------------------------
import DiscordLogin from "@/components/DiscordLogin";
import Header from "@/components/layout/Header";
import HackCard from "@/components/HackCard";
//COMPONENT IMPORTS-------------------------------------------------------------

//PAGES IMPORTS-----------------------------------------------------------------
import Account from "@/pages/Account";
import MyHacks from "@/pages/MyHacks";
import Playtesters, { PlaytestersList } from "@/pages/Playtesters";
import ModeratorHacks, { ModeratorHacksGrid } from "@/pages/ModeratorHacks";
import ModeratorUsers, { ModeratorUsersList } from "@/pages/ModeratorUsers";
//PAGES IMPORTS-----------------------------------------------------------------

//CONTEXTS IMPORTS--------------------------------------------------------------
import { useAuth } from "@/contexts/AuthContext";
//CONTEXTS IMPORTS--------------------------------------------------------------

//TYPE IMPORTS------------------------------------------------------------------
import type { Hack } from "@/types/hack";
//TYPE IMPORTS------------------------------------------------------------------

//TYPES-------------------------------------------------------------------------
type ApplyPlaytestDialogProps = {
    hackSlug: string;
    hackTitle: string;
    ownerId: string;
};

type TabViewProps = {
    defaultPage: string;
};

type SubmitHackDialogProps = {
    onSubmitted?: () => void;
};


type MyHacksGridProps = {
    refreshKey: number;
};
//TYPES------------------------------------------------------------------------

//GLOBALS----------------------------------------------------------------------
const myHacksCache = new Map<string, Hack[]>();
//GLOBALS----------------------------------------------------------------------


function useBanStatus(userId: string | undefined) {
    const [ isBanned, setIsBanned ] = useState<boolean | null>(null);
    const [ checkingBan, setCheckingBan ] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function checkBan() {
            setCheckingBan(true);
            setIsBanned(null);

            if (!userId) {
                setIsBanned(false);
                setCheckingBan(false);
                return;
            }

            try {
                const { data, error } = await supabase.rpc(
                    "is_current_user_banned"
                );

                if (error) {
                    throw error;
                }

                if (!cancelled) {
                    setIsBanned(data === true);
                }
            } catch {
                showErrorToast("Could not check ban status.");

                if (!cancelled) {
                    setIsBanned(null);
                }
            } finally {
                if (!cancelled) {
                    setCheckingBan(false);
                }
            }
        }

        void checkBan();

        return () => {
            cancelled = true;
        };
    }, [ userId ]);

    return { isBanned, checkingBan };
}

export default function App() {
    return (<>
        <Toaster />
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/account" element={<Account />} />
            <Route path="/my-hacks" element={<MyHacks />} />
            <Route path="/playtesters" element={<Playtesters />} />
            <Route path="/mod-hacks" element={<ModeratorHacks />} />
            <Route path="/mod-users" element={<ModeratorUsers />} />
            <Route path="/:slug" element={<HackPage />} />
        </Routes>
    </>
    );
}

function Home() {
    return (
        <div className="mx-auto p-4 flex flex-col animated-gradient min-h-screen">
            <Header></Header>
            <TabView defaultPage="home"></TabView>
        </div>
    )
}

export function TabView({ defaultPage }: TabViewProps) {
    const {
        user,
        loading,
        isModerator,
        roleLoading,
        cachedIsModerator,
    } = useAuth();
    const location = useLocation();

    const [ hacksRefreshKey, setHacksRefreshKey ] = useState(0);

    const showModeratorTabs =
        cachedIsModerator || (!roleLoading && isModerator);

    const routeToTab: Record<string, string> = {
        "/": "home",
        "/account": "account",
        "/my-hacks": "my-hacks",
        "/playtesters": "playtesters",
        "/mod-hacks": "mod-hacks",
        "/mod-users": "mod-users",
    };

    const currentTab = routeToTab[ location.pathname ] ?? defaultPage;

    useEffect(() => {
        //if (loading || roleLoading) return;

        if (
            !user ||
            (!isModerator &&
                (location.pathname === "/mod-hacks" ||
                    location.pathname === "/mod-users"))
        ) {
            // Don't redirect here; let your existing auth/routing logic decide.
            return;
        }
    }, [
        user,
        loading,
        roleLoading,
        isModerator,
        location.pathname,
    ]);

    const navigate = useNavigate();

    return (
        <Tabs value={currentTab} className="pt-2">

            <div className="tabs-scroll w-full overflow-x-auto">
                <TabsList className="inline-flex w-max min-w-full justify-start">
                    <TabsTrigger value="home" onClick={() => navigate("/")}>
                        <House />Home
                    </TabsTrigger>

                    <TabsTrigger value="account" onClick={() => navigate("/account")}>
                        <User />Account
                    </TabsTrigger>

                    <TabsTrigger value="my-hacks" onClick={() => navigate("/my-hacks")}>
                        <Monitor />My Hacks
                    </TabsTrigger>

                    <TabsTrigger value="playtesters" onClick={() => navigate("/playtesters")}>
                        <Play />Playtesters
                    </TabsTrigger>

                    {showModeratorTabs && (
                        <>
                            <TabsTrigger value="mod-hacks" onClick={() => navigate("/mod-hacks")}>
                                <Shield />Mod: Hacks
                            </TabsTrigger>

                            <TabsTrigger value="mod-users" onClick={() => navigate("/mod-users")}>
                                <Shield />Mod: Users
                            </TabsTrigger>
                        </>
                    )}
                </TabsList>
            </div>



            <Separator className="mt-2 mb-2" />

            <TabsContent value="home">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Hacks />
                </div>
            </TabsContent>

            <TabsContent value="account">
                <DiscordLogin />
            </TabsContent>

            <TabsContent value="my-hacks">
                <SubmitHackDialog
                    onSubmitted={() => {
                        setHacksRefreshKey((previous) => previous + 1);
                    }}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <MyHacksGrid refreshKey={hacksRefreshKey} />
                </div>
            </TabsContent>

            <TabsContent value="playtesters">
                <PlaytestersList />
            </TabsContent>

            {showModeratorTabs && (
                <>
                    <TabsContent value="mod-hacks">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <ModeratorHacksGrid />
                        </div>
                    </TabsContent>

                    <TabsContent value="mod-users">
                        <div className="mx-auto mt-6 w-full max-w-5xl">
                            <ModeratorUsersList />
                        </div>
                    </TabsContent>
                </>
            )}
        </Tabs>
    );
}



function Hacks() {
    //const [hacks, setHacks] = useState<Hack[]>([]);
    const [ error, setError ] = useState<string | null>(null);
    //const [loading, setLoading] = useState(true);

    const [ hacks, setHacks ] = useState<Hack[]>(
        () => getCachedHacks<Hack[]>() ?? []
    );

    const [ loading, setLoading ] = useState(
        () => getCachedHacks<Hack[]>() === null
    );

    useEffect(() => {
        let cancelled = false;

        async function loadHacks() {
            const { data, error: fetchError } = await supabase
                .from("hacks")
                .select("*")
                .eq("status", "approved")
                .order("created_at", { ascending: false });

            if (cancelled) {
                return;
            }

            if (fetchError) {
                setError(fetchError.message);
                setLoading(false);
                return;
            }

            const fetchedHacks = data ?? [];
            setHacks(fetchedHacks);
            saveCachedHacks(fetchedHacks);
            setError(null);
            setLoading(false);
        }

        void loadHacks();

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) return (<Card>
        <CardHeader>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
            <Skeleton className="aspect-video w-full" />
        </CardContent>
        <CardFooter>
            <Skeleton className="h-4 w-2/3" />
        </CardFooter>
    </Card>);
    if (error) return <p>Failed to load hacks: {error}</p>;
    if (hacks.length === 0) return <p>No hacks found.</p>;

    return (
        <>
            {hacks.map((hack) => (
                <HackCard key={hack.id} hack={hack} />
            ))}
        </>
    );
}

export function MyHacksGrid({ refreshKey }: MyHacksGridProps) {
    const { user, loading: authLoading } = useAuth();

    const [ hacks, setHacks ] = useState<Hack[]>([]);
    const [ loading, setLoading ] = useState(true);
    const [ error, setError ] = useState("");

    const [ hackToDelete, setHackToDelete ] = useState<string | null>(null);
    const [ deletingHackId, setDeletingHackId ] = useState<string | null>(null);

    async function deleteHack() {
        if (!user || !hackToDelete || deletingHackId) {
            return;
        }

        const hackId = hackToDelete;
        setDeletingHackId(hackId);

        try {
            const { data, error } = await supabase
                .from("hacks")
                .delete()
                .eq("id", hackId)
                .eq("owner_id", user.id)
                .select("id");

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                throw new Error(
                    "The hack wasn't deleted. Make sure you own this hack."
                );
            }

            setHacks((current) => {
                const updatedHacks = current.filter(
                    (hack) => String(hack.id) !== hackId
                );
                myHacksCache.set(user.id, updatedHacks);
                return updatedHacks;
            });

            clearCachedHacks();
            clearCachedModHacks(user.id);
            setHackToDelete(null);
        } catch {
            showErrorToast("Failed to delete hack.");
        } finally {
            setDeletingHackId(null);
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function fetchHacks() {
            if (authLoading) {
                return;
            }

            if (!user) {
                setHacks([]);
                setLoading(false);
                return;
            }

            const cacheKey = user.id;

            if (refreshKey === 0 && myHacksCache.has(cacheKey)) {
                setHacks(myHacksCache.get(cacheKey) ?? []);
                setLoading(false);
                setError("");
                return;
            }

            setLoading(true);
            setError("");

            try {
                const { data, error } = await supabase
                    .from("hacks")
                    .select("*")
                    .eq("owner_id", user.id)
                    .order("created_at", { ascending: false });

                if (error) {
                    throw error;
                }

                if (!cancelled) {
                    const fetchedHacks = data ?? [];

                    setHacks(fetchedHacks);
                    myHacksCache.set(cacheKey, fetchedHacks);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load your hacks."
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
    }, [ user?.id, authLoading, refreshKey ]);

    if (authLoading || loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <CardContent>
                        <Skeleton className="aspect-video w-full" />
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-4 w-2/3" />
                    </CardFooter>
                </CardHeader>
            </Card>
        );
    }

    if (!user) {
        return (
            <div className="p-4">
                <p className="mb-3">
                    Please sign in to view your hacks!
                </p>
                <DiscordLogin />
            </div>
        );
    }

    if (error) {
        return <p role="alert">Error: {error}</p>;
    }

    if (hacks.length === 0) {
        return <p>You haven't created any hacks yet. <strong>Get creating!!</strong></p>;
    }

    return (
        <>
            {hacks.map((hack) => (
                <HackCard
                    key={hack.id}
                    hack={hack}
                    showStatus
                    deletingHackId={deletingHackId}
                    onRequestDelete={setHackToDelete}
                />
            ))}
            <AlertDialog
                open={hackToDelete !== null}
                onOpenChange={(open) => {
                    if (!open && deletingHackId === null) {
                        setHackToDelete(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete this hack?
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                            This action cannot be undone. The hack will be deleted
                            from your account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletingHackId !== null}>
                            Cancel
                        </AlertDialogCancel>

                        <AlertDialogAction
                            disabled={deletingHackId !== null}
                            onClick={(event) => {
                                event.preventDefault();
                                void deleteHack();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deletingHackId !== null ? "Deleting..." : "Delete Hack"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}


function HackPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [ hack, setHack ] = useState<Hack | null>(null);
    const [ loading, setLoading ] = useState(true);
    const [ error, setError ] = useState<string | null>(null);
    const { user, cachedIsModerator, isModerator, roleLoading } = useAuth();

    const [ownerUsername, setOwnerUsername] = useState<string | null>(null);

    const [ playtesters, setPlaytesters ] = useState<
        { user_id: string; username: string; avatar_url: string | null }[]
    >([]);

    useEffect(() => {
        const targetSlug = hack?.slug;
        const ownerId = hack?.owner_id;
        const userId = user?.id;

        if (!targetSlug || !userId || ownerId !== userId) {
            setPlaytesters([]);
            return;
        }

        let cancelled = false;

        async function fetchPlaytesters() {
            const { data, error } = await supabase.rpc(
                "get_hack_playtesters",
                { target_slug: targetSlug }
            );

            if (error) {
                showErrorToast("Failed to fetch playtester profiles.");
                return;
            }

            if (!cancelled) {
                setPlaytesters(data ?? []);
            }
        }

        void fetchPlaytesters();

        return () => {
            cancelled = true;
        };
    }, [ hack?.slug, hack?.owner_id, user?.id ]);

    useEffect(() => {
        async function loadHack() {
            setLoading(true);
            setError(null);
            setHack(null);

            const { data, error } = await supabase
                .from("hacks")
                .select("*")
                .eq("slug", slug)
                .limit(1)
                .maybeSingle();

            console.log({data, error});

            if (error) {
                setError(error.message);
            } else {
                setHack(data);
            }

            setLoading(false);
        }

        if (slug) {
            loadHack();
        }
    }, [ slug ]);

    // Check only if mod
    useEffect(() => {
        if(!(cachedIsModerator || (!roleLoading && isModerator))) return;

        if(!hack?.owner_id) return;

        if(cachedIsModerator || (!roleLoading && isModerator)) {
            async function fetchHackOwnerUsername() {
                setOwnerUsername("Loading...");

                const { data, error } = await supabase
                        .from("user_roles")
                        .select("username")
                        .eq("user_id", hack?.owner_id);

                if(error || !data || (data.length == 0) || !data[0]?.username) {
                    if(error) console.warn(error);
                    showErrorToast("Failed to get the hack owner!");
                    setOwnerUsername("error");
                }
                
                setOwnerUsername(data?.[0]?.username ?? null);
            }

            fetchHackOwnerUsername();
        }
    }, [cachedIsModerator, roleLoading, isModerator, hack?.owner_id]);

    if (loading) return (
        <main className="mx-auto p-4 flex flex-col animated-gradient min-h-screen">
            <div>
                <Header></Header>

                <Separator className="mt-2 mb-2" />

                <Button
                    variant="outline"
                    aria-label="Back"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeftIcon />
                    Back
                </Button>
                <p className="p-4">Loading hack...</p>
            </div>
        </main>
    );

    if (error) return (
        <main className="mx-auto p-4 flex flex-col animated-gradient min-h-screen">
            <div>
                <Header></Header>

                <Separator className="mt-2 mb-2" />

                <Button
                    variant="outline"
                    aria-label="Back"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeftIcon />
                    Back
                </Button>
                <p className="p-4">Error: {error}</p>
            </div>
        </main>
    );
    
    if (!hack) return (
        <main className="mx-auto p-4 flex flex-col animated-gradient min-h-screen">
            <div>
                <Header></Header>

                <Separator className="mt-2 mb-2" />

                <Button
                    variant="outline"
                    aria-label="Back"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeftIcon />
                    Back
                </Button>
                <p className="p-4">Hack not found.</p>
            </div>
        </main>

    );

    const imageUrl = hack.image
        ? supabase.storage
            .from("hack_thumbnails")
            .getPublicUrl(hack.image).data.publicUrl
        : null;

    let difficultyCategory: string = "what the fuck";
    if (Number(hack.difficulty) < 25) difficultyCategory = "Casual";
    else if (Number(hack.difficulty) < 50) difficultyCategory = "Light Kaizo";
    else if (Number(hack.difficulty) < 75) difficultyCategory = "Normal Kaizo";
    else if (Number(hack.difficulty) < 100) difficultyCategory = "Super Kaizo";
    else if (Number(hack.difficulty) == 100) difficultyCategory = "TAS Only";

    async function copyCredits() {
        try {
            let credits = "Playtesters: ";
            for (let i = 0;i < playtesters.length;i++) {
                if (i != playtesters.length - 1) credits += playtesters[ i ].username + ", ";
                else credits += playtesters[ i ].username;
            }
            await navigator.clipboard.writeText(credits);
        } catch {
            showErrorToast("Failed to copy credits.");
        }
    }

    return (
        <main className="animated-gradient min-h-screen">
            <div className="mx-auto p-4">
                <Header></Header>

                <Separator className="mt-2 mb-2" />

                <Button
                    variant="outline"
                    aria-label="Back"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeftIcon />
                    Back
                </Button>

                <div className="flex flex-col md:flex-row">
                    <div className="mx-auto flex-1">
                        <h1 className="mt-4 text-3xl font-bold">{hack.name}</h1>
                        <p className="mt-2">{hack.short_description}</p>
                        {(cachedIsModerator || (!roleLoading && isModerator)) && (<p className="mt-2">Submitted by: <strong>{ownerUsername}</strong></p>)}
                        <div className="flex items-center"><Users className="mt-1" /><p className="mt-2 ml-1"><strong>Authors:</strong> {hack.authors}</p></div>

                        {imageUrl && (
                            <img
                                src={imageUrl}
                                alt={hack.name}
                                className="mt-4 w-[400px] rounded-lg"
                            />
                        )}

                        <p className="mt-4">{hack.long_description}</p>
                        <div className="flex items-center">
                            <div className="flex items-center"><Flame /><p className="mt-2 ml-1"><strong>Difficulty:</strong> {hack.difficulty}</p></div>
                            <Badge className="mt-2 ml-2">{difficultyCategory}</Badge>
                        </div>
                        <div className="flex items-center"><Star /><p className="ml-1"><strong>Star Count:</strong> {hack.star_count}</p></div>
                        <div className="flex items-center"><Timer /><p className="ml-1"><strong>Estimated Playtime:</strong> {hack.playtime_hours}h {hack.playtime_minutes}m</p></div>
                        <div className="flex items-center"><Tags /><p className="ml-1"><strong>Tags:</strong> {hack.tags}</p></div>

                        <ApplyPlaytestDialog hackSlug={hack.slug} hackTitle={hack.name} ownerId={hack.owner_id}></ApplyPlaytestDialog>

                    </div>

                    {user?.id === hack.owner_id && (
                        <Card className="mt-2 w-full md:w-1/4">
                            <CardHeader>
                                <CardTitle>Playtesters</CardTitle>
                                {playtesters.length > 0 && (<Button variant="outline" onClick={
                                    copyCredits
                                }><Copy />Copy Credits</Button>)}
                            </CardHeader>

                            <CardContent className="space-y-3">
                                {playtesters.length == 0 && (
                                    <p>You have not approved any playtesters yet!</p>
                                )}

                                {playtesters.map((playtester) => (
                                    <div
                                        key={playtester.user_id}
                                        className="flex items-center gap-3"
                                    >
                                        <Avatar>
                                            <AvatarImage src={playtester.avatar_url ?? undefined} />
                                            <AvatarFallback>
                                                {playtester.username.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>

                                        <span>{playtester.username}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </main>
    );
}

export function ApplyPlaytestDialog({
    hackSlug,
    hackTitle,
    ownerId,
}: ApplyPlaytestDialogProps) {
    const { user, loading } = useAuth();

    const [ message, setMessage ] = useState("");
    const [ submitting, setSubmitting ] = useState(false);
    const [ open, setOpen ] = useState(false);
    const [ error, setError ] = useState("");
    const [ success, setSuccess ] = useState("");
    const [ rulesOpen, setRulesOpen ] = useState(false);

    const { isBanned, checkingBan } = useBanStatus(user?.id);
    
    function handleApply(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setRulesOpen(true);
    } 

    async function applyPlaytest() {
        if (!user) {
            setError("Please sign in with Discord before applying.");
            return;
        }

        setSubmitting(true);
        setError("");
        setSuccess("");

        try {
            const { data: hack, error: hackError } = await supabase
                .from("hacks")
                .select("slug, name, owner_id")
                .eq("slug", hackSlug)
                .single();

            if (hackError || !hack) {
                throw new Error("Could not find this hack.");
            }

            if (!hack.owner_id) {
                throw new Error("This hack does not have an assigned owner.");
            }

            if (hack.owner_id === user.id) {
                throw new Error("You cannot apply to playtest your own hack.");
            }

            const metadata = user.user_metadata ?? {};

            const discordUsername = String(
                metadata.user_name ??
                metadata.full_name ??
                metadata.name ??
                "Discord user"
            );

            const avatarCandidate =
                metadata.avatar_url ?? metadata.picture ?? null;
            const avatarUrl =
                typeof avatarCandidate === "string" &&
                avatarCandidate.startsWith("https://")
                    ? avatarCandidate
                    : null;

            const { error: insertError } = await supabase
                .from("playtest_applications")
                .insert({
                    hack_slug: hack.slug,
                    hack_name: hack.name ?? hackTitle,
                    owner_id: hack.owner_id,
                    applicant_id: user.id,
                    applicant_discord_username: discordUsername,
                    applicant_avatar_url: avatarUrl,
                    message: message.trim(),
                });

            if (insertError) {
                if (insertError.code === "23505") {
                    throw new Error(
                        "You've already applied to this hack."
                    );
                }

                throw insertError;
            }

            await pushNotification({
                toUser: hack.owner_id,
                message: `Your hack "${hack.name}" has recieved a playtest application!`,
            });

            setSuccess("Your application was sent successfully!");
            setMessage("");
            setOpen(false);
        } catch (err) {
            showErrorToast("Playtest application failed.");

            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to submit your application."
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return null;
    }

    if (!user) {
        return (
            <>
                <p className="mt-2">
                    Sign in with Discord to apply for playtesting.
                </p>
                <DiscordLogin />
            </>
        );
    }

    if (!user || user.id === ownerId) {
        return null;
    }

    if (checkingBan) {
        return <p className="mt-2 text-sm text-muted-foreground">
            Checking account status...
        </p>;
    }

    if (isBanned === null) {
        return <p className="mt-2 text-sm text-destructive" role="alert">
            Could not verify your account status. Please try again later.
        </p>;
    }

    if (isBanned) {
        return (
            <p className="mt-2 text-sm text-destructive" role="alert">
                Your account is temporarily banned. You cannot apply for
                playtesting while your ban is active.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger
                    render={
                        <Button
                            variant="outline"
                            className="mt-2"
                            onClick={() => {
                                setError("");
                                setSuccess("");
                            }}
                        >
                            <Gamepad2 />
                            Apply
                        </Button>
                    }
                />

                <DialogContent className="sm:max-w-sm">
                    <form onSubmit={handleApply}>
                        <DialogHeader>
                            <DialogTitle>
                                Apply for Playtesting
                            </DialogTitle>

                            <DialogDescription>
                                Your Discord username and profile picture
                                will be sent to the hack owner. You may
                                leave an optional message explaining why
                                you'd like to playtest this hack.
                            </DialogDescription>
                        </DialogHeader>

                        <FieldGroup className="py-4">
                            <Field>
                                <Label htmlFor="playtest-message">
                                    Message (optional)
                                </Label>

                                <Textarea
                                    id="playtest-message"
                                    name="message"
                                    placeholder="I'm a real good kaizo player, I beat 74..."
                                    value={message}
                                    onChange={(event) =>
                                        setMessage(event.target.value)
                                    }
                                    maxLength={2000}
                                />

                                <p className="text-xs text-muted-foreground">
                                    {message.length}/2000 characters
                                </p>
                            </Field>
                        </FieldGroup>

                        {error && (
                            <p
                                className="mb-3 text-sm text-destructive"
                                role="alert"
                            >
                                {error}
                            </p>
                        )}

                        <DialogFooter>
                            <DialogClose
                                render={
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </Button>
                                }
                            />

                            <Button
                                type="submit"
                                disabled={submitting}
                            >
                                <Gamepad2 />
                                {submitting ? "Applying..." : "Apply"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={rulesOpen} onOpenChange={setRulesOpen}>
            <AlertDialogContent className="max-w-lg">
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Playtesting Rules
                    </AlertDialogTitle>

                    <AlertDialogDescription>
                        Please review these rules before applying to playtest.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <ScrollArea className="h-64 w-full rounded-md border p-4">
                    <div className="space-y-4 text-sm">
                        <section className="space-y-2">
                            <h3 className="font-semibold">
                                1. Message
                            </h3>
                            <p>
                                Your message shall not contain any mean words targeted towards the hack owner or anyone else. 
                                Remember that users can report you. Please keep your message polite and respectful.
                            </p>
                        </section>

                        <section className="space-y-2">
                            <h3 className="font-semibold">
                                2. Playtesting
                            </h3>
                            <p>
                                There is a number of things that makes a playtester good, though the basics are: 
                                <p>· concisely note down issues, as well as things you find good or interesting about the hack</p>
                                <p>· if you find a part frustrating or unfun, note it down and take a break; otherwise you'll 
                                have a bad mindset for the rest of the playtest</p>
                                <p>· keep your criticism constructive; not too mean but also not too unnecessarily nice</p>
                            </p>
                        </section>

                        <section className="space-y-2">
                            <h3 className="font-semibold">
                                3. Have fun!
                            </h3>
                            <p>
                                Playtesting is not exactly a job, but it's also not exactly a walk in the park. 
                                Be prepared to face problems and frustration. The most important part is to have fun!
                            </p>
                        </section>
                    </div>
                </ScrollArea>

                <AlertDialogFooter>
                    <AlertDialogCancel>
                        Cancel
                    </AlertDialogCancel>

                    <AlertDialogAction
                        onClick={() => {
                            setRulesOpen(false);
                            void applyPlaytest();
                        }}
                    >
                        Accept & Apply
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>


            {success && (
                <p className="text-sm text-green-600" role="status">
                    {success}
                </p>
            )}
        </div>
    );
}

export function SubmitHackDialog({
    onSubmitted,
}: SubmitHackDialogProps) {
    const { user } = useAuth();

    const [ open, setOpen ] = useState(false);
    const [ name, setName ] = useState("");
    const [ slug, setSlug ] = useState("");
    const [ shortDescription, setShortDescription ] = useState("");
    const [ longDescription, setLongDescription ] = useState("");
    const [ authors, setAuthors ] = useState("");
    const [ difficulty, setDifficulty ] = useState("0");
    const [ tags, setTags ] = useState("");
    const [ thumbnail, setThumbnail ] = useState<File | null>(null);
    const [ submitting, setSubmitting ] = useState(false);
    const [ errorMessage, setErrorMessage ] = useState("");
    const [ successMessage, setSuccessMessage ] = useState("");
    const [ starCount, setStarCount ] = useState("0");
    const [ playtimeHours, setPlaytimeHours ] = useState("0");
    const [ playtimeMinutes, setPlaytimeMinutes ] = useState("0");

    const { isBanned, checkingBan } = useBanStatus(user?.id);

    const [ tosOpen, setTosOpen ] = useState(false);

    const [ usedSlug, setUsedSlug ] = useState<boolean | null>(null);

    let normalizedSlug = "";

    function resetForm() {
        setName("");
        setSlug("");
        setShortDescription("");
        setLongDescription("");
        setAuthors("");
        setDifficulty("0");
        setTags("");
        setThumbnail(null);
        setErrorMessage("");
        setSuccessMessage("");
    }

    function handleNameChange(value: string) {
        setName(value);

        setSlug(
            value
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
        );
    }

    useEffect(() => {
        async function verifySlug() {
            setUsedSlug(null);

            if(!normalizedSlug) {
                return;
            }

            const { data, error } = await supabase
                .from("hacks")
                .select("slug")
                .eq("slug", normalizedSlug)
                .maybeSingle();

            console.log(data);

            if(error) {
                setErrorMessage("Could not fetch hacks for slug verification!");
                showErrorToast("Could not fetch hacks for slug verification!");
                return;
            }

            setUsedSlug(!!data);
        }
        verifySlug();
    }, [ normalizedSlug ]);

    function handleThumbnailChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file = event.target.files?.[ 0 ];

        setErrorMessage("");

        if (!file) {
            setThumbnail(null);
            return;
        }

        if (!file.type.startsWith("image/")) {
            setErrorMessage("Please select an image file.");
            event.target.value = "";
            setThumbnail(null);
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setErrorMessage("The thumbnail must be smaller than 5 MB.");
            event.target.value = "";
            setThumbnail(null);
            return;
        }

        const image = new Image();
        const objectUrl = URL.createObjectURL(file);

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);

            if (image.width * 3 !== image.height * 4) {
                setErrorMessage(
                    "The thumbnail must have a 4:3 aspect ratio, such as 1200 × 900."
                );
                setThumbnail(null);
                event.target.value = "";
                return;
            }

            setThumbnail(file);
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            setErrorMessage("Could not read that image.");
            setThumbnail(null);
            event.target.value = "";
        };

        image.src = objectUrl;
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setTosOpen(true);
    }


    async function submitHack() {
        setErrorMessage("");
        setSuccessMessage("");

        if (!user) {
            setErrorMessage("You must sign in before submitting a hack.");
            showErrorToast("You must sign in before submitting a hack.");
            return;
        }

        if (checkingBan) {
            setErrorMessage("Please wait while we verify your account status.");
            showErrorToast("Please wait while we verify your account status.");
            return;
        }

        if (isBanned !== false) {
            setErrorMessage(
                isBanned === true
                    ? "Your account is temporarily banned and cannot upload hacks."
                    : "Could not verify your account status. Please try again."
            );
            showErrorToast(
                isBanned === true
                    ? "Your account is temporarily banned and cannot upload hacks."
                    : "Could not verify your account status. Please try again."
            );
            return;
        }

        if (!thumbnail) {
            setErrorMessage("Please select a valid 4:3 thumbnail.");
            showErrorToast("Please select a valid 4:3 thumbnail.");
            return;
        }

        const parsedDifficulty = Number(difficulty);

        if (
            !Number.isFinite(parsedDifficulty) ||
            parsedDifficulty < 0
        ) {
            setErrorMessage("Difficulty must be a non-negative number.");
            showErrorToast("Difficulty must be a non-negative number.");
            return;
        }

        const parsedStarCount = Math.round(Number(starCount));

        if (
            !Number.isFinite(parsedStarCount) ||
            parsedStarCount < 0
        ) {
            setErrorMessage("Star count must be a non-negative number.");
            showErrorToast("Star count must be a non-negative number.");
            return;
        }

        const parsedPlaytimeHours = Math.round(Number(playtimeHours));

        if (
            !Number.isFinite(parsedPlaytimeHours) ||
            parsedPlaytimeHours < 0
        ) {
            setErrorMessage("Playtime hours must be a non-negative number.");
            showErrorToast("Playtime hours must be a non-negative number.");
            return;
        }

        const parsedPlaytimeMinutes = Math.round(Number(playtimeMinutes));

        if (
            !Number.isFinite(parsedPlaytimeMinutes) ||
            parsedPlaytimeMinutes < 0
        ) {
            setErrorMessage("Playtime minutes must be a non-negative number.");
            showErrorToast("Playtime minutes must be a non-negative number.");
            return;
        }


        normalizedSlug = slug
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

        if(usedSlug) {
            setErrorMessage("Slug is already used in another hack!");
            showErrorToast("Slug is already used in another hack!");
            return;
        } 

        if (!normalizedSlug) {
            setErrorMessage("Please enter a valid slug.");
            showErrorToast("Please enter a valid slug.");
            return;
        }

        setSubmitting(true);

        let uploadedPath: string | null = null;

        try {
            const {
                data: currentlyBanned,
                error: banError,
            } = await supabase.rpc("is_current_user_banned");

            if (banError) {
                throw new Error(
                    "Could not verify your account status. Please try again."
                );
            }

            if (currentlyBanned !== false) {
                throw new Error(
                    "Your account is temporarily banned and cannot upload hacks."
                );
            }

            const fileExtension =
                thumbnail.name.split(".").pop()?.toLowerCase() || "png";

            const safeExtension = /^[a-z0-9]+$/.test(fileExtension)
                ? fileExtension
                : "png";

            const thumbnailPath =
                `${user.id}/${crypto.randomUUID()}.${safeExtension}`;

            const { error: uploadError } = await supabase.storage
                .from("hack_thumbnails")
                .upload(thumbnailPath, thumbnail, {
                    contentType: thumbnail.type,
                    upsert: false,
                });

            if (uploadError) {
                throw new Error(
                    `Thumbnail upload failed: ${uploadError.message}`
                );
            }

            uploadedPath = thumbnailPath;

            const { error: insertError } = await supabase
                .from("hacks")
                .insert({
                    name: name.trim(),
                    slug: normalizedSlug,
                    short_description: shortDescription.trim(),
                    image: thumbnailPath,
                    long_description: longDescription.trim(),
                    authors: authors.trim(),
                    difficulty: parsedDifficulty,
                    tags,
                    status: "pending",
                    owner_id: user.id,
                    star_count: parsedStarCount,
                    playtime_hours: parsedPlaytimeHours,
                    playtime_minutes: parsedPlaytimeMinutes,
                });

            if (insertError) {
                throw new Error(
                    `Could not submit hack: ${insertError.message}`
                );
            }

            setSuccessMessage(
                "Your hack has been submitted for moderation!"
            );


            onSubmitted?.();

            window.setTimeout(() => {
                setOpen(false);
                resetForm();
            }, 1200);
        } catch (error) {
            showErrorToast("Hack submission failed.");

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Something went wrong while submitting your hack."
            );

            if (uploadedPath) {
                const pathToRemove = uploadedPath;

                void supabase.storage
                    .from("hack_thumbnails")
                    .remove([ pathToRemove ])
                    .then(({ error: cleanupError }) => {
                        if (cleanupError) {
                            showErrorToast(
                                "Could not clean up uploaded thumbnail."
                            );
                        }
                    })
                    .catch(() => {
                        showErrorToast("Thumbnail cleanup failed.");
                    });
            }
        } finally {
            setSubmitting(false);
        }
    }


    return (<>
        {user && (
            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    if (!submitting) {
                        setOpen(nextOpen);

                        if (!nextOpen) {
                            resetForm();
                        }
                    }
                }}
            >
                <DialogTrigger >
                    <Button className="mb-2">
                        <CirclePlus />
                        Submit Hack
                    </Button>
                </DialogTrigger>

                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Submit Hack</DialogTitle>
                        <DialogDescription>
                            Make your hack available for playtesting. Your
                            submission will be reviewed by moderators before
                            appearing publicly.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="hack-name">Name</Label>
                            <Input
                                id="hack-name"
                                value={name}
                                onChange={(event) =>
                                    handleNameChange(event.target.value)
                                }
                                placeholder=""
                                maxLength={100}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="hack-slug">Slug</Label>
                            <Input
                                id="hack-slug"
                                value={slug}
                                onChange={(event) => setSlug(event.target.value)}
                                placeholder=""
                                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                                maxLength={100}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Used in your hack's URL. Lowercase letters,
                                numbers, and hyphens only.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="hack-short-description">
                                Short Description
                            </Label>
                            <Input
                                id="hack-short-description"
                                value={shortDescription}
                                onChange={(event) =>
                                    setShortDescription(event.target.value)
                                }
                                placeholder=""
                                maxLength={200}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="hack-thumbnail">Thumbnail</Label>

                            <div
                                className="relative flex min-h-48 flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 transition-colors hover:border-primary/50"
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                }}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();

                                    const file = event.dataTransfer.files?.[ 0 ];

                                    if (!file) {
                                        return;
                                    }

                                    const input = document.getElementById(
                                        "hack-thumbnail"
                                    ) as HTMLInputElement | null;

                                    if (!input) {
                                        return;
                                    }

                                    const transfer = new DataTransfer();
                                    transfer.items.add(file);
                                    input.files = transfer.files;
                                    input.dispatchEvent(
                                        new Event("change", { bubbles: true })
                                    );
                                }}
                            >
                                {thumbnail ? (
                                    <div className="w-full space-y-3 p-3">
                                        <img
                                            src={URL.createObjectURL(thumbnail)}
                                            alt="Thumbnail preview"
                                            className="aspect-[4/3] w-full rounded-md object-cover"
                                        />

                                        <div className="flex items-center justify-between gap-3">
                                            <p className="truncate text-sm text-muted-foreground">
                                                {thumbnail.name}
                                            </p>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setThumbnail(null);

                                                    const input =
                                                        document.getElementById(
                                                            "hack-thumbnail"
                                                        ) as HTMLInputElement | null;

                                                    if (input) {
                                                        input.value = "";
                                                    }
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                                        <div className="rounded-full bg-muted p-3">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="28"
                                                height="28"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <rect
                                                    width="18"
                                                    height="18"
                                                    x="3"
                                                    y="3"
                                                    rx="2"
                                                />
                                                <circle cx="9" cy="9" r="2" />
                                                <path d="m21 15-5-5L5 21" />
                                            </svg>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">
                                                Drop your thumbnail here
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                PNG, JPEG, or WebP · 4:3 ratio · Max
                                                5 MB
                                            </p>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                document
                                                    .getElementById("hack-thumbnail")
                                                    ?.click()
                                            }
                                        >
                                            Choose image
                                        </Button>
                                    </div>
                                )}

                                <Input
                                    id="hack-thumbnail"
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={handleThumbnailChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="hack-long-description">
                                Long Description
                            </Label>
                            <Textarea
                                id="hack-long-description"
                                value={longDescription}
                                onChange={(event) =>
                                    setLongDescription(event.target.value)
                                }
                                placeholder=""
                                rows={6}
                                maxLength={10000}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="hack-authors">Authors</Label>
                            <Input
                                id="hack-authors"
                                value={authors}
                                onChange={(event) =>
                                    setAuthors(event.target.value)
                                }
                                placeholder=""
                                maxLength={300}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Separate multiple authors with commas.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="hack-difficulty">Difficulty</Label>
                            <Input
                                id="hack-difficulty"
                                type="number"
                                value={difficulty}
                                onChange={(event) =>
                                    setDifficulty(event.target.value)
                                }
                                min="0"
                                step="any"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                0-25 Casual, 25-50 Light Kaizo,
                                50-75 Normal Kaizo, 75-100 Super Kaizo, 100 TAS Only
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="hack-star-count">Star Count</Label>
                            <Input
                                id="hack-star-count"
                                type="number"
                                value={starCount}
                                onChange={(event) =>
                                    setStarCount(event.target.value)
                                }
                                min="0"
                                step="any"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Please don't lie!!
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="hack-playtime-hours">Playtime (hours)</Label>
                            <Input
                                id="hack-playtime-hours"
                                type="number"
                                value={playtimeHours}
                                onChange={(event) =>
                                    setPlaytimeHours(event.target.value)
                                }
                                min="0"
                                step="any"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Please don't lie (x2)!!
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="hack-playtime-minutes">Playtime (minutes)</Label>
                            <Input
                                id="hack-playtime-minutes"
                                type="number"
                                value={playtimeMinutes}
                                onChange={(event) =>
                                    setPlaytimeMinutes(event.target.value)
                                }
                                min="0"
                                step="any"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Please don't lie (x3)!!
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="hack-tags">Tags</Label>
                            <Input
                                id="hack-tags"
                                value={tags}
                                onChange={(event) => setTags(event.target.value)}
                                placeholder=""
                            />
                            <p className="text-xs text-muted-foreground">
                                Separate tags with commas.
                            </p>
                        </div>

                        {errorMessage && (
                            <p
                                role="alert"
                                className="text-sm text-destructive"
                            >
                                {errorMessage}
                            </p>
                        )}

                        {successMessage && (
                            <p
                                role="status"
                                className="text-sm text-green-600"
                            >
                                {successMessage}
                            </p>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={submitting}
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>

                            <Button type="submit" disabled={submitting}>
                                {submitting
                                    ? "Submitting..."
                                    : "Submit for Review"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>)}
        <AlertDialog open={tosOpen} onOpenChange={setTosOpen}>
            <AlertDialogContent className="max-w-lg">
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Code of Conduct
                    </AlertDialogTitle>

                    <AlertDialogDescription>
                        Please review these rules before submitting your hack.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <ScrollArea className="h-64 w-full rounded-md border p-4">
                    <div className="space-y-4 text-sm">
                        <section className="space-y-2">
                            <h3 className="font-semibold">
                                1. Submission Requirements
                            </h3>
                            <p>
                                You must provide accurate information about your
                                hack and ensure that your submission is complete
                                and suitable for review.
                            </p>
                        </section>

                        <section className="space-y-2">
                            <h3 className="font-semibold">
                                2. Ownership and Permissions
                            </h3>
                            <p>
                                In case the hack isn't yours, you must have full permission from the creator of the hack in order to submit it.
                            </p>
                        </section>

                        <section className="space-y-2">
                            <h3 className="font-semibold">
                                3. Moderation
                            </h3>
                            <p>
                                Submissions are subject to moderation. A submission
                                may be approved, declined, or require changes before
                                it can be published.
                            </p>
                        </section>

                        <section className="space-y-2">
                            <h3 className="font-semibold">
                                4. Accurate Information
                            </h3>
                            <p>
                                You agree to provide truthful information and not
                                misrepresent your submission or its authorship.
                            </p>
                        </section>

                        <section className="space-y-2">
                            <h3 className="font-semibold">
                                5. Content
                            </h3>
                            <p>
                                Your hack must be human-made, AI submissions will be promptly rejected.
                                It shall not contain pornography, gore or other inappropriate content.
                            </p>
                        </section>
                    </div>
                </ScrollArea>

                <AlertDialogFooter>
                    <AlertDialogCancel>
                        Cancel
                    </AlertDialogCancel>

                    <AlertDialogAction
                        onClick={() => {
                            event?.preventDefault();
                            setTosOpen(false);
                            void submitHack();
                        }}
                    >
                        Accept & Submit
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </>
    );
}
