import { Header, TabView } from "@/App"

export default function MyHacks() {
  return (
    <main className="mx-auto p-4 flex flex-col animated-gradient min-h-screen">
        <Header></Header>
        <TabView defaultPage="my-hacks"></TabView>
    </main>
  );
}
