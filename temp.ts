
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
            status,
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
            },
        });

    if (req.method !== "POST") {
        return json({ error: "Method not allowed." }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const channelId = Deno.env.get("DISCORD_CHANNEL_ID");

    try {
        const authorization = req.headers.get("Authorization");

        if (!authorization?.startsWith("Bearer ")) {
            return json({ error: "Unauthorized." }, 401);
        }

        const supabase = createClient(supabaseUrl, anonKey, {
            global: {
                headers: { Authorization: authorization },
            },
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return json({ error: "Invalid session." }, 401);
        }

        const { hackSlug, status } = await req.json();

        if (
            typeof hackSlug !== "string" ||
            !hackSlug.trim() ||
            !["approved", "declined"].includes(status)
        ) {
            return json({ error: "Invalid request." }, 400);
        }

        const admin = createClient(supabaseUrl, serviceKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });

        const { data: roleData, error: roleError } = await admin
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);

        if (roleError) {
            console.error("Role lookup failed:", roleError);
            return json({ error: "Could not verify permissions." }, 500);
        }

        const isModerator = roleData?.some(
            (entry) => entry.role === "moderator" || entry.role === "admin"
        );

        if (!isModerator) {
            return json({ error: "Forbidden." }, 403);
        }

        const { data: hack, error: updateError } = await admin
            .from("hacks")
            .update({ status })
            .eq("slug", hackSlug.trim())
            .eq("status", "pending")
            .select("slug, name, status, image")
            .maybeSingle();

        if (updateError) {
            console.error("Hack update failed:", updateError);
            return json({ error: "Failed to update hack." }, 500);
        }

        if (!hack) {
            return json(
                { error: "Hack not found or no longer pending." },
                409
            );
        }

        let notificationSent = false;

        if (status === "approved") {
            if (!botToken || !channelId) {
                console.error("Discord secrets are not configured.");
            } else {
                const discordResponse = await fetch(
                    `https://discord.com/api/v10/channels/${channelId}/messages`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bot ${botToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            embeds: [
                                {
                                    title: "🎉 New hack approved!",
                                    description:
                                        `**${hack.name}** has been approved on Playtest64.`,
                                    color: 0x57f287,
                                    url:
                                        `https://uncaughtreference.github.io/Playtest64/#/hacks/${encodeURIComponent(hack.slug)}`,
                                    image: hack.image,
                                },
                            ],
                            allowed_mentions: { parse: [] },
                        }),
                    }
                );

                notificationSent = discordResponse.ok;

                if (!discordResponse.ok) {
                    console.error(
                        "Discord API error:",
                        discordResponse.status,
                        await discordResponse.text()
                    );
                }
            }
        }

        return json({
            hack,
            notificationSent,
        });
    } catch (error) {
        console.error("Unexpected function error:", error);
        return json({ error: "Internal server error." }, 500);
    }
});

