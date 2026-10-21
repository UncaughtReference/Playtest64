import { toast } from "@/components/ui/toast";

export function showErrorToast(message: string): void {
    toast.add({
        type: "error",
        description: message,
        priority: "high",
    });
}
