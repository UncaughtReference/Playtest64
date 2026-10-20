import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
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

import { ArrowLeftIcon, Gamepad2 } from "lucide-react"

import { useEffect, useState, type FormEvent  } from "react";
import { supabase } from "@/lib/supabase";

import { Routes, Route } from "react-router-dom";
import { useParams, Link } from "react-router-dom";

import DiscordLogin from "@/components/DiscordLogin";

import Account from "@/pages/Account";
import MyHacks from "@/pages/MyHacks";

import { useAuth } from "@/contexts/AuthContext";

type ApprovedHack = {
  id: number;
  created_at: string;
  name: string;
  short_description: string;
  long_description: string;
  authors: string;
  tags: string;
  difficulty: number;
  image: string;
  slug: string;
  owner_id: string;
    status: string;
};

type ApplyPlaytestDialogProps = {
    hackSlug: string;
    hackTitle: string;
    ownerId: string;
};

type TabViewProps = {
    defaultPage: string;
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/account" element={<Account />} />
      <Route path="/my-hacks" element={<MyHacks />} />
      <Route path="/:slug" element={<HackPage />} />
    </Routes>
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
    return (<Tabs defaultValue={defaultPage} className="pt-2">
			  	<TabsList>
					<Link to="/"><TabsTrigger value="home">Home</TabsTrigger></Link>
					<Link to="/account"><TabsTrigger value="account">Account</TabsTrigger></Link>
                    <Link to="/my-hacks"><TabsTrigger value="my-hacks">My Hacks</TabsTrigger></Link>
			  	</TabsList>
	
				<Separator className="mt-2 mb-2"/>

			  	<TabsContent value="home">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						<ApprovedHacks></ApprovedHacks>
					</div>
			  	</TabsContent>
			  <TabsContent value="account"><DiscordLogin /></TabsContent>
              <TabsContent value="my-hacks">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						<MyHacksGrid></MyHacksGrid>
					</div>
              </TabsContent>
		    </Tabs> )
}

export function Header() {
	return (
		<header className="flex items-center justify-between">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl">Playtest64</h1>
			</div>
		</header>
	)
}

function ApprovedHacks() {
  const [hacks, setHacks] = useState<ApprovedHack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHacks() {
      const { data, error } = await supabase
        .from("hacks")
        .select("*")
        .eq("status", "approved");

      if (error) {
        setError(error.message);
      } else {
        setHacks(data ?? []);
      }

      setLoading(false);
    }

    loadHacks();
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
          <ApprovedHack key={hack.id} hack={hack} />
        ))}
      </>
    );
}

export function MyHacksGrid() {
    const { user, loading: authLoading } = useAuth();

    const [hacks, setHacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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

            setLoading(true);
            setError("");

            try {
                const { data, error } = await supabase
                    .from("hacks")
                    .select("*")
                    .eq("owner_id", user.id);

                if (error) {
                    throw error;
                }

                if (!cancelled) {
                    setHacks(data ?? []);
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
    }, [user, authLoading]);

    if (authLoading || loading) {
        return <p>Loading your hacks...</p>;
    }

    if (!user) {
        return <p>Please sign in to view your hacks.</p>;
    }

    if (error) {
        return <p role="alert">Error: {error}</p>;
    }

    if (hacks.length === 0) {
        return <p>You haven't created any hacks yet.</p>;
    }


    return (
      <>
        {hacks.map((hack) => (
          <ApprovedHack key={hack.id} hack={hack} />
        ))}
      </>
    );
}

function ApprovedHack({ hack }: { hack: ApprovedHack }) {
  return (
	<Link to={`/${encodeURIComponent(hack.slug)}`}>
		<Card className="
		  transition-all duration-300 ease-out
		  hover:-translate-y-1
		  hover:border-primary/50
		  hover:shadow-lg hover:shadow-primary/10
		  hover:scale-[1.02]
		">
		  <CardHeader>
			<CardTitle>{hack.name}</CardTitle>
			<CardDescription>
			  {hack.short_description}
			</CardDescription>
		  </CardHeader>

		  <CardContent>
			<img
			  src={
				supabase.storage
				  .from("hack_thumbnails")
				  .getPublicUrl(hack.image).data.publicUrl
			  }
			  alt={hack.name}
			  className="w-full h-auto rounded-md"
		  loading="lazy"
		/>
      </CardContent>

      <CardFooter>
        <p>{hack.authors}</p>
      </CardFooter>
		</Card>
	</Link>
  );
}

function HackPage() {
  const { slug } = useParams<{ slug: string }>();
  const [hack, setHack] = useState<ApprovedHack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHack() {
      setLoading(true);
      setError(null);
      setHack(null);

      const { data, error } = await supabase
        .from("hacks")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

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
  }, [slug]);

  if (loading) return <p className="p-4">Loading hack...</p>;
  if (error) return <p className="p-4">Error: {error}</p>;
  if (!hack) return <p className="p-4">Hack not found.</p>;

  const imageUrl = hack.image
    ? supabase.storage
        .from("hack_thumbnails")
        .getPublicUrl(hack.image).data.publicUrl
    : null;

  return (
    <main className="animated-gradient min-h-screen">
		<div className="max-w-4xl p-4">
			<Header></Header>
			
			<Separator className="mt-2 mb-2"/>

		  	<Link to="/">
			  	<Button variant="outline" aria-label="Back">
					<ArrowLeftIcon />
					Back
			  	</Button>	
		  	</Link>

			<div className="mx-auto">
			  <h1 className="mt-4 text-3xl font-bold">{hack.name}</h1>
			  <p className="mt-2">{hack.short_description}</p>
			  <p className="mt-2">Authors: {hack.authors}</p>

			  {imageUrl && (
				<img
				  src={imageUrl}
				  alt={hack.name}
				  className="mt-4 w-[400px] rounded-lg"
				/>
			  )}

			  <p className="mt-4">{hack.long_description}</p>
			  <p className="mt-2">Difficulty: {hack.difficulty}</p>
			  <p className="">Tags: {hack.tags}</p>
				
			    <ApplyPlaytestDialog hackSlug={hack.slug} hackTitle={hack.name} ownerId={hack.owner_id}></ApplyPlaytestDialog>	

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

    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function applyPlaytest(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

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

            const avatarUrl = (
                metadata.avatar_url ??
                metadata.picture ??
                null
            ) as string | null;

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

            setSuccess("Your application was sent successfully!");
            setMessage("");
            setOpen(false);
       } catch (err) {
    console.error("Playtest application error:", err);

    if (err && typeof err === "object") {
        console.error(
            "Error details:",
            JSON.stringify(err, Object.getOwnPropertyNames(err), 4)
        );
    }

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
            <DiscordLogin/>
            </>
        );
    }

    if (!user || user.id === ownerId) {
        return null;
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
                    <form onSubmit={applyPlaytest}>
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
                                    placeholder="I'd love to help test this hack..."
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

            {success && (
                <p className="text-sm text-green-600" role="status">
                    {success}
                </p>
            )}
        </div>
    );
}
