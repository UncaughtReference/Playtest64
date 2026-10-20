import { Link } from "react-router-dom";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { Hack } from "@/types/hack";

type HackCardProps = {
    hack: Hack;
    onApprove?: () => void;
    onDecline?: () => void;
    actionLoading?: boolean;
    showStatus?: boolean;
    deletingHackId?: string | null;
    onRequestDelete?: (hackId: string) => void;
};

function HackStatusBadge({ status }: { status: string }) {
    const normalizedStatus = status.toLowerCase();
    const statusStyles: Record<string, string> = {
        pending: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
        approved: "bg-green-500/15 text-green-600 border-green-500/30",
        declined: "bg-red-500/15 text-red-600 border-red-500/30",
    };
    const label =
        normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);

    return (
        <Badge
            variant="outline"
            className={
                statusStyles[normalizedStatus] ??
                "bg-muted text-muted-foreground"
            }
        >
            {label}
        </Badge>
    );
}

export default function HackCard({
    hack,
    onApprove,
    onDecline,
    actionLoading = false,
    showStatus = false,
    deletingHackId = null,
    onRequestDelete,
}: HackCardProps) {
    const thumbnailUrl = hack.image
        ? supabase.storage.from("hack_thumbnails").getPublicUrl(hack.image).data
            .publicUrl
        : null;

    return (
        <Card className="transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/50 hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/10">
            <CardHeader>
                <div className="flex items-center justify-between gap-2">
                    <CardTitle>
                        <Link to={`/${encodeURIComponent(hack.slug)}`}>
                            {hack.name}
                        </Link>
                    </CardTitle>
                    {showStatus && <HackStatusBadge status={hack.status} />}
                </div>
                <CardDescription>{hack.short_description}</CardDescription>
            </CardHeader>

            {thumbnailUrl && (
                <CardContent>
                    <Link to={`/${encodeURIComponent(hack.slug)}`}>
                        <img
                            src={thumbnailUrl}
                            alt={`${hack.name} thumbnail`}
                            className="h-auto w-full rounded-md"
                            loading="lazy"
                        />
                    </Link>
                </CardContent>
            )}

            <CardFooter className="flex flex-wrap items-center justify-between gap-3">
                <p>{hack.authors}</p>

                {(onApprove || onDecline) && (
                    <div className="flex items-center gap-2">
                        {onDecline && (
                            <Button
                                variant="destructive"
                                disabled={actionLoading}
                                onClick={onDecline}
                            >
                                {actionLoading ? "Processing..." : "Decline"}
                            </Button>
                        )}
                        {onApprove && (
                            <Button disabled={actionLoading} onClick={onApprove}>
                                {actionLoading ? "Processing..." : "Approve"}
                            </Button>
                        )}
                    </div>
                )}

                {onRequestDelete && (
                    <Button
                        variant="destructive"
                        disabled={deletingHackId !== null}
                        onClick={() => onRequestDelete(String(hack.id))}
                    >
                        {deletingHackId === String(hack.id) ? "Deleting..." : "Delete Hack"}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
