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

export default function App() {
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
						<Hack></Hack>
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

function Hack() {
	return (
		<Card className="
		  transition-all duration-300 ease-out
		  hover:-translate-y-1
		  hover:border-primary/50
		  hover:shadow-lg hover:shadow-primary/10
		  hover:scale-[1.02]
		">
		  <CardHeader>
			<CardTitle>Tale of the Ztar's Darkness</CardTitle>
			<CardDescription>Luigi's new adventure!</CardDescription>
		  </CardHeader>
		  <CardContent>
			<img src={`${import.meta.env.BASE_URL}assets/totzd.jpg`} className="w-full h-auto rounded-md"/>	
		  </CardContent>
		  <CardFooter>
			<p>ZennyTheZtarBones</p>
		  </CardFooter>
		</Card>
	)
}
