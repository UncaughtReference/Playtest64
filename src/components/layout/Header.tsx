import { Heart, Bell, CircleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Drawer, 
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
    Card,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type Notification = {
    id: string;
    to_user: string;
    message: string;
    seen: boolean;
    created_at?: string;
};

export default function Header() {
    return (
        <header className="flex items-center justify-between">
            <div className="flex items-center">
                <img
                    src={`${import.meta.env.BASE_URL}assets/logo.png`}
                    alt="Playtest64 logo"
                    className="w-[50px]"
                />
                <h1 className="ml-2 text-2xl">Playtest64</h1>
            </div>
            <div className="hidden md:flex md:flex-row">
                <p className="mr-2">Made with love for the Mario</p>
                <Heart />
            </div>
            <NotificationsButton/>
        </header>
    );
}

function NotificationsButton() {
    const [ open, setOpen ] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [ loadingNotifications, setLoadingNotifications ] = useState(false);
    const unseenCount = notifications?.filter(
        (notification) => !notification.seen
    ).length;
    const { user } = useAuth();
    
    async function handleOpenChange(nextOpen: boolean) {
        setOpen(nextOpen);

        if (!nextOpen || !user?.id) {
            return;
        }

        const { error } = await supabase
            .from("notifications")
            .update({ seen: true })
            .eq("to_user", user?.id)
            .eq("seen", false);

        if (error) {
            console.error("Failed to mark notifications as seen:", error.message);
            return;
        }

        setNotifications((current) =>
            current.map((notification) => ({
                ...notification,
                seen: true,
            }))
        );
    }

    useEffect(() => {
        const userId = user?.id;

        if (!userId) {
            setNotifications([]);
            return;
        }

        let cancelled = false;

        async function fetchNotifications() {
            setLoadingNotifications(true);

            try {
                const { data, error } = await supabase
                    .from("notifications")
                    .select("*")
                    .eq("to_user", user?.id)
                    .order("created_at", { ascending: false });

                if (error) {
                    console.error("Failed to fetch notifications:", error.message);
                    return;
                }

                if (!cancelled) {
                    setNotifications(data ?? []);
                }
            } catch (error) {
                console.error("Unexpected error fetching notifications:", error);
            } finally {
                if (!cancelled) {
                    setLoadingNotifications(false);
                }
            }
        }

        void fetchNotifications();

        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    if(!user) return;    

    return (
        <Drawer 
        open={open} 
        onOpenChange={handleOpenChange} 
        showSwipeHandle={true}
        swipeDirection="right">
            <DrawerTrigger render={
                <Button variant="outline" className="relative">
                    <Bell />
                    {unseenCount > 0 && (
                        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                            {unseenCount > 99 ? "99+" : unseenCount}
                        </span>
                    )} 
                </Button>
            }/>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Notifications</DrawerTitle>
                </DrawerHeader>
                
                <Separator className="mt-2 mb-2"/>

                <div className="mr-2">
                    {loadingNotifications ? (
                        <p className="ml-4">Loading...</p>
                    ) : ( notifications?.length === 0 ? (
                        <p className="ml-4">No notifications yet!</p>
                    ) : (
                        notifications?.map((notification) => (
                            <Card className="mt-2">
                                <CardContent className="flex">
                                    <CircleAlert />
                                    <p className="ml-2">{notification.message}</p>
                                </CardContent>
                                    <CardFooter>
                                        <p className="ml-2">{
                                            notification.created_at
                                                ? new Date(notification.created_at).toLocaleString("en-GB", {
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })
                                                : "Unknown date" 
                                        }</p>
                                    </CardFooter>
                            </Card>
                        )))
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
}
