import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");

Deno.serve(async (req: Request) => {
    if (req.method !== "POST") {
        return Response.json(
            { error: "Method not allowed" },
            { status: 405 }
        );
    }

    const expectedSecret = Deno.env.get("PLAYTEST_WEBHOOK_SECRET");
    const suppliedSecret = req.headers.get("x-webhook-secret");

    if (
        !expectedSecret ||
        !suppliedSecret ||
        suppliedSecret !== expectedSecret
    ) {
        return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    let payload: {
        type?: string;
        table?: string;
        schema?: string;
        record?: {
            owner_id?: string;
            hack_name?: string;
            applicant_discord_username?: string;
            applicant_id?: string;
            message?: string;
        };
    };

    try {
        payload = await req.json();
    } catch {
        return Response.json(
            { error: "Invalid JSON payload" },
            { status: 400 }
        );
    }

    if (
        payload.type !== "INSERT" ||
        payload.table !== "playtest_applications" ||
        payload.schema !== "public" ||
        !payload.record
    ) {
        return Response.json(
            { error: "Unexpected webhook payload" },
            { status: 400 }
        );
    }

    const application = payload.record;

    if (!application.owner_id) {
        return Response.json(
            { error: "Application has no owner_id" },
            { status: 400 }
        );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");

    if (!supabaseUrl || !serviceRoleKey || !botToken) {
        console.error("A required server secret is missing.");

        return Response.json(
            { error: "Server configuration error" },
            { status: 500 }
        );
    }

    const supabase = createClient(
        supabaseUrl,
        serviceRoleKey,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        }
    );

    const { data: owner, error: ownerError } = await supabase
        .from("user_discord")
        .select("discord_id")
        .eq("user_id", application.owner_id)
        .maybeSingle();

    if (ownerError) {
        console.error("Failed to look up playtest owner:", ownerError.message);

        return Response.json(
            { error: "Could not look up playtest owner" },
            { status: 500 }
        );
    }

    if (!owner?.discord_id) {
        return Response.json(
            { success: true, skipped: true, reason: "Owner has no saved Discord ID" }
        );
    }

    const discordHeaders = {
        "Authorization": `Bot ${botToken}`,
        "Content-Type": "application/json",
    };

    try {
        const dmResponse = await fetch(
            "https://discord.com/api/v10/users/@me/channels",
            {
                method: "POST",
                headers: discordHeaders,
                body: JSON.stringify({
                    recipient_id: owner.discord_id,
                }),
            }
        );

        if (!dmResponse.ok) {
            const details = await dmResponse.text();
            console.error("Discord DM channel creation failed:", dmResponse.status, details);

            return Response.json(
                { error: "Could not open a DM with the playtest owner" },
                { status: 502 }
            );
        }

        const dmChannel = await dmResponse.json();

        const applicantName =
            application.applicant_discord_username || "A Discord user";
        const playtestName = application.hack_name || "a playtest";
        const applicationMessage =
            (application.message || "No message provided").slice(0, 1500);

        const randomGreetingId = Math.floor(Math.random() * (6 - 0 + 1)) + 0;

        const greetings = [
            "Hi!",
            "Hi there!",
            "Hello :)",
            "What's up?",
            "Hope you're having a nice day!",
            "Hiii!",
            "Sup!",
        ];

        const messageContent = [
            `****${greetings[randomGreetingId]}****`,
            `New application for **${playtestName}**!`,
            "",
            `**Applicant:** *${applicantName}*`,
            `**Message:** *${applicationMessage}*`,
            "",
            `Approve their application on *Playtest64* to give them **XP!**`,
            `You can now message them on Discord and send them your hack! GG!`
        ].join("\n");

        const messageResponse = await fetch(
            `https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
            {
                method: "POST",
                headers: discordHeaders,
                body: JSON.stringify({
                    content: messageContent,
                    components: [
                        {
                            type: 1,
                            components: [
                                {
                                    type: 2,
                                    style: 5,
                                    label: "View Playtesters",
                                    url: "https://uncaughtreference.github.io/Playtest64/#/playtesters",
                                },
                            ],
                        },
                    ],
                    allowed_mentions: {
                        parse: [],
                    },
                }),
            }
        );

        if (!messageResponse.ok) {
            const details = await messageResponse.text();
            console.error("Discord message send failed:", messageResponse.status, details);

            return Response.json(
                { error: "Could not send Discord notification" },
                { status: 502 }
            );
        }

        const sentMessage = await messageResponse.json();

        console.log("Discord message accepted:", {
            messageId: sentMessage.id,
            channelId: sentMessage.channel_id,
            recipientId: owner.discord_id,
        });

        return Response.json({ success: true });
    } catch (error) {
        console.error(
            "Discord notification request failed:",
            error instanceof Error ? error.message : "Unknown error"
        );

        return Response.json(
            { error: "Discord notification failed" },
            { status: 502 }
        );
    }
});

