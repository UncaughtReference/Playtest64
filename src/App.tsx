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

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import { Routes, Route } from "react-router-dom";
import { useParams, Link } from "react-router-dom";

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
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:slug" element={<HackPage />} />
    </Routes>
  );
}

function Home() {
	return ( 
		<div className="mx-auto p-4 flex flex-col animated-gradient min-h-screen">
			<Header></Header>
			<Tabs defaultValue="browse" className="pt-2">
			  	<TabsList>
					<TabsTrigger value="browse">Browse</TabsTrigger>
					<TabsTrigger value="account">Account</TabsTrigger>
			  	</TabsList>
	
				<Separator className="mt-2 mb-2"/>

			  	<TabsContent value="browse">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						<ApprovedHacks></ApprovedHacks>
					</div>
			  	</TabsContent>
			  <TabsContent value="account"></TabsContent>
			</Tabs>
		</div>
	)
}

function Header() {
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
        .from("ApprovedHacks")
        .select("*");

      if (error) {
        setError(error.message);
      } else {
        setHacks(data ?? []);
      }

      setLoading(false);
    }

    loadHacks();
  }, []);

  if (loading) return <p>Loading hacks...</p>;
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
				  .from("ApprovedHackThumbnails")
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
        .from("ApprovedHacks")
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
        .from("ApprovedHackThumbnails")
        .getPublicUrl(hack.image).data.publicUrl
    : null;

  return (
    <main className="animated-gradient min-h-screen">
		<div className="mx-auto max-w-4xl p-4">
		  <Link to="/" className="underline">
			← Back
		  </Link>

		  <h1 className="mt-4 text-3xl font-bold">{hack.name}</h1>
		  <p className="mt-2">{hack.short_description}</p>

		  {imageUrl && (
			<img
			  src={imageUrl}
			  alt={hack.name}
			  className="mt-4 w-full rounded-lg"
			/>
		  )}

		  <p className="mt-4">{hack.long_description}</p>
		  <p className="mt-2">Authors: {hack.authors}</p>
		  <p className="mt-2">Difficulty: {hack.difficulty}</p>
		  <p className="mt-2">Tags: {hack.tags}</p>
	  </div>
    </main>
  );
}
