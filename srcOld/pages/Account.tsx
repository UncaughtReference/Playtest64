import { TabView } from "@/App";
import Header from "@/components/layout/Header";

export default function Account() {
  return (
    <main className="mx-auto p-4 flex flex-col animated-gradient min-h-screen">
        <Header></Header>
        <TabView defaultPage="account"></TabView>
    </main>
  );
}
