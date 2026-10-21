import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LogOut, BadgeCheck, Send, Hourglass, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

import { Link } from "react-router-dom"

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

    const [xp, setXp] = useState<number | null>(null);

    useEffect(() => {
        async function fetchXp() {
            if (!user?.id) {
                setXp(null);
                return;
            }

            const { data, error } = await supabase
                .from("user_roles")
                .select("xp")
                .eq("user_id", user.id)
                .single();

            if (error) {
                console.error("Failed to fetch XP:", error);
                return;
            }

            setXp(data.xp);
        }

        void fetchXp();
    }, [user?.id]); 

    const [hackCount, setHackCount] = useState<number | null>(null);
    const [approvedCount, setApprovedCount] = useState<number | null>(null);
    const [pendingCount, setPendingCount] = useState<number | null>(null);
    const [declinedCount, setDeclinedCount] = useState<number | null>(null);

    useEffect(() => {
    async function countHacks() {
        setHackCount(null);
        setApprovedCount(null);
        setPendingCount(null);
        setDeclinedCount(null);

        const results = await Promise.all([
            supabase
                .from("hacks")
                .select("*", { count: "exact", head: true })
                .eq("owner_id", user?.id),

            supabase
                .from("hacks")
                .select("*", { count: "exact", head: true })
                .eq("owner_id", user?.id)
                .eq("status", "approved"),

            supabase
                .from("hacks")
                .select("*", { count: "exact", head: true })
                .eq("owner_id", user?.id)
                .eq("status", "pending"),

            supabase
                .from("hacks")
                .select("*", { count: "exact", head: true })
                .eq("owner_id", user?.id)
                .eq("status", "declined"),
        ]);

        const [total, approved, pending, declined] = results;

        for (const result of results) {
            if (result.error) {
                console.error("Failed to count hacks:", result.error);
                return;
            }
        }

        setHackCount(total.count ?? 0);
        setApprovedCount(approved.count ?? 0);
        setPendingCount(pending.count ?? 0);
        setDeclinedCount(declined.count ?? 0);
    }

        if (user?.id) {
            countHacks();
        } else {
            setHackCount(0);
            setApprovedCount(0);
            setPendingCount(0);
            setDeclinedCount(0);
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

    let totalHackString: string;
    if(hackCount == null) {
        totalHackString = "Loading...";
    } else {
        if(hackCount == 1) totalHackString = hackCount + " hack submitted";
        else totalHackString = hackCount + " hacks submitted";
    }

    let totalApprovedHackString: string;
    if(approvedCount == null) {
        totalApprovedHackString = "Loading...";
    } else {
        if(approvedCount == 1) totalApprovedHackString = approvedCount + " approved hack";
        else totalApprovedHackString = approvedCount + " approved hacks";
    }

    let totalPendingHackString: string;
    if(pendingCount == null) {
        totalPendingHackString = "Loading...";
    } else {
        if(pendingCount == 1) totalPendingHackString = pendingCount + " pending hack";
        else totalPendingHackString = pendingCount + " pending hacks";
    }

    let totalDeclinedHackString: string;
    if(declinedCount == null) {
        totalDeclinedHackString = "Loading...";
    } else {
        if(declinedCount == 1) totalDeclinedHackString = declinedCount + " declined hack";
        else totalDeclinedHackString = declinedCount + " declined hacks";
    }
    
    const subLevels = [
        1,
        5,
        10,
        15,
        20,
        25,
        30,
        35
    ];

    let maxXp = 50;
    let level = 1;
    let maxXpMult = 2.25;
    let subLevel = 1;

    if(xp != null) {
        while(xp >= maxXp) {
            for(let i = 0; i < 8; i++) {
                if(level == subLevels[i]) { subLevel = 1; break; }
            }

            maxXp *= maxXpMult;
            maxXp = Math.round(maxXp);
            level++;
            subLevel++;

            if(level > 3) {
                if(level > 6) {
                    if(level > 9) {
                        if(level > 12) {
                            maxXpMult = 1.025;
                        } else {
                            maxXpMult = 1.05;
                        }
                    } else {
                        maxXpMult = 1.1;
                    }
                } else {
                    maxXpMult = 1.25;
                }
            }
        }
    }

    const progress = xp === null
    ? 0
    : Math.min((xp / maxXp) * 100, 100); 

    const levelNames = [
        "Baby Tester",
        "Novice Tester",
        "Regular Tester",
        "Pro Tester",
        "God Tester",
        "Universe-shattering Tester",
        "4th-wall-breaking Tester",
        "Ultimate Tester"
    ];

    let levelId = 0;

    if(level > 5) {
        if(level > 10) {
            if(level > 15) {
                if(level > 20) {
                    if(level > 25) {
                        if(level > 30) {
                            if(level > 35) {
                                levelId = 7;
                            } else {
                                levelId = 6;
                            }
                        } else {
                            levelId = 5;
                        }
                    } else {
                        levelId = 4;
                    }
                } else {
                    levelId = 3;
                }
            } else {
                levelId = 2;
            }
        } else {
            levelId = 1;
        }
    }

    const levelName = levelNames[levelId];

    function toRomanNumeral(num: number): string {
        const romanNumerals: [number, string][] = [
            [1000, "M"],
            [900, "CM"],
            [500, "D"],
            [400, "CD"],
            [100, "C"],
            [90, "XC"],
            [50, "L"],
            [40, "XL"],
            [10, "X"],
            [9, "IX"],
            [5, "V"],
            [4, "IV"],
            [1, "I"],
        ];

        let result = "";

        for (const [value, symbol] of romanNumerals) {
            while (num >= value) {
                result += symbol;
                num -= value;
            }
        }

        return result;
    }

    return (<>
        <Card>
            <CardContent>
                <div className="flex items-center">
                    {avatar && (
                        <img
                            src={avatar}
                            alt={`${displayName}'s avatar`}
                            className="h-16 w-16 rounded-full"
                        />
                    )}
                    <div>
                    <p className="mb-0 ml-2">
                        <strong>{displayName}</strong>
                    </p>

                    <p className="ml-2 mt-1">
                        {roleLoading ? (
                            "Loading..."
                        ) : isModerator ? (
                            <Badge variant="outline" className="bg-green-500/15 text-green-600 border-green-500/30">
                                Moderator
                            </Badge>
                        ) : (
                            <Badge variant="outline">
                                User
                            </Badge>
                        )}
                    </p>
                    </div>

                    {error && <p role="alert">{error}</p>}
                </div>

            <Button className="mt-2" variant="destructive" onClick={logout}>
                <LogOut />
                Log out
            </Button>
            </CardContent>
        </Card>

        <div className="mt-2 flex w-full gap-2">
            <Card className="min-w-0 flex-1">
                <CardContent>
                    <div className="flex items-center">
                        <Send /> 
                        <p className="ml-2">{totalHackString}</p>
                    </div>
                </CardContent>
            </Card>
            <Card className="min-w-0 flex-1">
                <CardContent>
                    <div className="flex items-center">
                        <BadgeCheck className="text-green-500"/>
                        <p className="ml-2">{totalApprovedHackString}</p>
                    </div>
                </CardContent>
            </Card>
            <Card className="min-w-0 flex-1">
                <CardContent>
                    <div className="flex items-center">
                        <Hourglass color="#eab308"/>
                        <p className="ml-2">{totalPendingHackString}</p>
                    </div>
                </CardContent>
            </Card>
            <Card className="min-w-0 flex-1">
                <CardContent>
                    <div className="flex items-center">
                        <X className="text-red-500"/> 
                        <p className="ml-2">{totalDeclinedHackString}</p>
                    </div>
                </CardContent>
            </Card>
        </div>

            <Card className="min-w-0 flex-1 mt-2">
                <CardContent>
                    <p>{levelName} {toRomanNumeral(subLevel)}</p>
                    <div className="flex items-center gap-2 mt-2">  
                        <p className="text-lg">{level}</p>
                        <div className="relative w-full">
                            <Progress value={progress} className="w-full h-4"/>
                            <span className="absolute inset-0 flex items-center justify-center font-bold">
                                {xp} / {maxXp} XP
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
       
        <div>
            <p className="mt-2">Join the <strong>Playtest64 Discord server</strong> to get updates on your hacks and newly approved ones!</p>
            
            <Link to="https://discord.gg/zZtHrffxEd" target="_blank" rel="noopener noreferrer">
            <Button className="mt-2" variant="outline">
                <img
                    src={`${import.meta.env.BASE_URL}assets/discord-icon.svg`}
                    alt=""
                    className="w-[20px]"
                />
                Join    
            </Button></Link>
        </div>
    </>);
}

