import { supabase } from "@/lib/supabase";

type PushNotificationParams = {
    toUser: string;
    message: string;
};

export async function pushNotification({
    toUser,
    message,
}: PushNotificationParams) {
    if (!toUser || !message.trim()) {
        return {
            success: false,
            error: "Recipient and message are required.",
        };
    }

    const { data, error } = await supabase
        .from("notifications")
        .insert({
            to_user: toUser,
            message: message.trim(),
        })
        .select()
        .single();

    if (error) {
        console.error("Failed to create notification:", error.message);

        return {
            success: false,
            error: error.message,
        };
    }

    return {
        success: true,
        notification: data,
    };
}
