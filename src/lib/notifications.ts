
import { supabase } from "@/lib/supabase";

type PushNotificationParams = {
    toUser: string;
    message: string;
};

type PushNotificationResponse = {
    success: boolean;
    error?: string;
    notification?: unknown;
};

export async function pushNotification({
    toUser,
    message,
}: PushNotificationParams) {
    const trimmedMessage = message.trim();

    if (!toUser || !trimmedMessage) {
        return {
            success: false,
            error: "Recipient and message are required.",
        };
    }

    try {
        const { data, error } =
            await supabase.functions.invoke<PushNotificationResponse>(
                "push-notification",
                {
                    body: {
                        toUser,
                        message: trimmedMessage,
                    },
                }
            );

            console.log("Edge Function response:", { data, error });

        if (error) {
            console.error("Failed to invoke notification function:", error.message);

            return {
                success: false,
                error: error.message,
            };
        }

        if (!data?.success) {
            return {
                success: false,
                error: data?.error ?? "Failed to create notification.",
            };
        }

        return {
            success: true,
            notification: data.notification,
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error
                ? error.message
                : "Unexpected notification error.";

        console.error(errorMessage);

        return {
            success: false,
            error: errorMessage,
        };
    }
}

