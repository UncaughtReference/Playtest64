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
import { Input } from "@/components/ui/input";

import { ArrowLeftIcon, Gamepad2, CirclePlus } from "lucide-react"

import { useEffect, useState, type FormEvent, type ChangeEvent  } from "react";
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

type SubmitHackDialogProps = {
    onSubmitted?: () => void;
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
                   <SubmitHackDialog
        onSubmitted={() => {
            // Refresh your hack list here, if necessary.
        }}
    /> 
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
        return (<Card>
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
    }

    if (!user) {
        return (<>
                <div>
                <p>Please sign in to view your hacks.</p>
                <DiscordLogin/>
                </div>
               </>);
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
		  hover:scale-[1.01]
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

  if (loading) return (
        <main className="mx-auto p-4 flex flex-col animated-gradient min-h-screen">
            <Header></Header>

            <Separator className="mt-2 mb-2"/>

		  	<Link to="/">
			  	<Button variant="outline" aria-label="Back">
					<ArrowLeftIcon />
					Back
			  	</Button>	
		  	</Link>

            <p className="p-4">Loading hack...</p>
        </main>
  );
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

    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [shortDescription, setShortDescription] = useState("");
    const [longDescription, setLongDescription] = useState("");
    const [authors, setAuthors] = useState("");
    const [difficulty, setDifficulty] = useState("1");
    const [tags, setTags] = useState("");
    const [thumbnail, setThumbnail] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");


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

    function handleThumbnailChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file = event.target.files?.[0];

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

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        if (!user) {
            setErrorMessage("You must sign in before submitting a hack.");
            return;
        }

        if (!thumbnail) {
            setErrorMessage("Please select a valid 4:3 thumbnail.");
            return;
        }

        const parsedDifficulty = Number(difficulty);

        if (
            !Number.isFinite(parsedDifficulty) ||
            parsedDifficulty < 0
        ) {
            setErrorMessage("Difficulty must be a non-negative number.");
            return;
        }

        const normalizedSlug = slug
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

        if (!normalizedSlug) {
            setErrorMessage("Please enter a valid slug.");
            return;
        }

        setSubmitting(true);

        let uploadedPath: string | null = null;

        try {
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
                    tags: tags,
                    status: "pending",
                    owner_id: user.id,
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
            console.error("Hack submission failed:", error);

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Something went wrong while submitting your hack."
            );

            // Remove the uploaded file if inserting the row failed.
            if (uploadedPath) {
                const { error: cleanupError } = await supabase.storage
                    .from("hack_thumbnails")
                    .remove([uploadedPath]);

                if (cleanupError) {
                    console.error(
                        "Could not clean up uploaded thumbnail:",
                        cleanupError.message
                    );
                }
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
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
            <DialogTrigger>
                {user && (<>
                <Button className="mb-2">
                <CirclePlus/>    
                Submit Hack
                </Button></>
                )} 
            </DialogTrigger>

            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Submit Hack</DialogTitle>
                    <DialogDescription>
                        Make your hack avialable for playtesting. Your submission
                        will be reviewed by moderators before appearing publicly.
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
                            placeholder="Tung Tung Tung Sahur's Brainrot Kaizo Demo 67 Green Comet"
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
                            placeholder="triple-t-adventures"
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
                            placeholder="Explore Triple-T's wonderful world!"
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

            const file = event.dataTransfer.files?.[0];

            if (!file) return;

            const input = document.getElementById(
                "hack-thumbnail"
            ) as HTMLInputElement | null;

            if (!input) return;

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

                            const input = document.getElementById(
                                "hack-thumbnail"
                            ) as HTMLInputElement | null;

                            if (input) input.value = "";
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
                        PNG, JPEG, or WebP · 4:3 ratio · Max 5 MB
                    </p>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                        document.getElementById("hack-thumbnail")?.click()
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
                            placeholder="Tung Tung Tung Sahur might be one of the best characters in all of fiction. His design, vibe, lore... it all makes for a fantastic little fella."
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
                            placeholder="liuzijun, stranger_sm64"
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
                            max="30"
                            step="any"
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            0.0-10.0 Casual, 10.0-15.0 Light Kaizo, 15.0-20.0 Normal Kaizo, 20.0-Onwards Super Kaizo
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hack-tags">Tags</Label>
                        <Input
                            id="hack-tags"
                            value={tags}
                            onChange={(event) => setTags(event.target.value)}
                            placeholder="kaizo, brainrot, green comet"
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
        </Dialog>)}</>
    );
}
