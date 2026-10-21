import { TabView } from "@/App";
import Header from "@/components/layout/Header";

export default function MyHacks() {
  return (
    <main className="mx-auto p-4 flex flex-col animated-gradient min-h-screen">
        <Header></Header>
        <TabView defaultPage="my-hacks"></TabView>
    </main>
  );
}
