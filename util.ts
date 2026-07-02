// Common utiliy functions.
import { HelixChatUserColor } from "@twurple/api";
import { chatClient, apiClient } from "./client.js";
import {
    getBroadcasterChannels,
    getBroadcasterIdFromChannel,
} from "./broadcaster.js";
import { ChatUser } from "@twurple/chat";
import { webServer } from "./webserver.js";
import { SharedChatState } from "./sharedchat.js";

export const me = await apiClient.users.getMe();

// TODO: Make weeklyBotPrint have better customizable colors.

export function weeklyBotPrint(message: string) {
    // TODO: Remove console log.
    console.log(message);
    webServer.printMessage(message);
}

let wb_color = "#FFFFFF";
set_wb_color(await apiClient.chat.getColorForUser(me.id));

export function set_wb_color(colorHex: string | null | undefined) {
    if (colorHex) {
        wb_color = colorHex;
    } else {
        wb_color = "#FFFFFF";
    }
}

export function get_wb_color(): string {
    return wb_color;
}

export async function timeout(
    excludeChannel: string | null,
    user: ChatUser,
    duration: number,
    reason: string
) {
    if (user.isBroadcaster || user.isMod) {
        return;
    }

    for (const channel of getBroadcasterChannels()) {
        if (channel != excludeChannel) {
            try {
                const broadcasterId = getBroadcasterIdFromChannel(channel);
                if (broadcasterId) {
                    await apiClient.moderation.banUser(broadcasterId, me, {
                        duration: duration,
                        reason: reason,
                        userId: user.userId,
                    });
                }
            } catch (err) {
                weeklyBotPrint(`ERROR: ${err}`);
            }
        }
    }
}

// ── Twitch Shared Chat aware relaying ────────────────────────────────────────
//
// The Shared Chat topology + chat-group logic lives in the dependency-free,
// unit-tested SharedChatState (see sharedchat.ts). This module owns the singleton
// instance and the actual chat IO. Always emit via broadcast/relay/send (never
// chatClient.say directly) so grouping is respected.
const sharedChat = new SharedChatState();

// A message is "native" to the room it was received in when it did not originate in
// another channel's Shared Chat room. Only native messages are processed, so a single
// user message is handled exactly once even though Twitch delivers a mirrored copy to
// every participating channel WeeklyBot has joined.
export function isNativeMessage(roomId: string | null, sourceRoomId: string | undefined): boolean {
    return SharedChatState.isNativeMessage(roomId, sourceRoomId);
}

// Records what an incoming message tells us about the current Shared Chat topology.
// `roomId` is the message's `room-id` tag (the channel it was received in) and
// `sourceRoomId` is its `source-room-id` tag (undefined when no session is active).
export function recordSharedChatMessage(roomId: string | null, sourceRoomId: string | undefined) {
    sharedChat.record(roomId, sourceRoomId);
}

export function isSharedChatActive(): boolean {
    return sharedChat.isActive();
}

// Partitions the connected broadcaster channels into groups, where each group is a
// set of channels that currently share a Twitch chat (a Shared Chat session or a lone
// channel). Channels are returned in connection order; the first channel of each group
// is used as its representative for relaying/broadcasting.
export function getChatGroups(): string[][] {
    return sharedChat.groupChannels(getBroadcasterChannels());
}

export async function relay(sourceChannel: string, msg: string) {
    // Forward to one representative of every other chat group. Channels in the source
    // message's own group already see it (directly, or mirrored by Twitch Shared Chat).
    const targets = sharedChat.relayTargets(getBroadcasterChannels(), sourceChannel);
    await Promise.all(targets.map((channel) => send(channel, msg)));
}

export async function broadcast(msg: string) {
    // Post once per chat group so every connected channel sees the message exactly once.
    const targets = sharedChat.broadcastTargets(getBroadcasterChannels());
    await Promise.all(targets.map((channel) => send(channel, msg)));
}

export async function broadcastLater(msg: string, delayMs: number) {
    setTimeout(() => {
        broadcast(msg);
        weeklyBotPrint(`[Delayed Print Message]: ${msg}`);
    }, delayMs);
}

export async function send(channel: string, msg: string): Promise<void> {
    try {
        await chatClient.say(channel, msg, undefined, { limitReachedBehavior: "throw" });
    } catch (err) {
        weeklyBotPrint(`${err}`);
    }
}

export async function clipIt(delay: boolean) {
    for (let channel of getBroadcasterChannels()) {
        let broadcaster_id = getBroadcasterIdFromChannel(channel);
        if (broadcaster_id) {
            let stream = await apiClient.streams.getStreamByUserId(broadcaster_id);
            if (stream === null) {
                weeklyBotPrint(`${channel} is not live.`);
            } else {
                try {
                    let id = await apiClient.clips.createClip({
                        channelId: broadcaster_id,
                        createAfterDelay: delay,
                    });
                    if (id !== null && id !== undefined && id.length > 0) {
                        let clip = "https://clips.twitch.tv/" + id.toString();
                        send(channel, `${channel} clip: ${clip}`);
                        //let user = ChatUser.userId
                        //await HelixUser.whispers.sendWhisper( /*weeklybot id, */ user, clip)
                        //note: there are many ways this command could fail
                        //weeklybot needs to have a phonenumber associated with it to be allowed to send whispers
                        //additionally so does the user receiving the whisper
                        //the user making the command also needs to have whispers turned on
                        //weeklybot needs the whisper permission included as part of its token
                        //both weeklybot and the receiving user have a limit of 40 unique user whispers per day
                        //full documentation: https://dev.twitch.tv/docs/api/reference/#send-whisper
                        //it would likely be better if this was a separate method in order to check for all of these errors
                    }
                } catch (err) {
                    weeklyBotPrint(`${err}`);
                }
            }
        } else {
            weeklyBotPrint(`Could not find matching id for ${channel}`);
        }
    }
}

export function getRandomColor(): HelixChatUserColor {
    const colors: HelixChatUserColor[] = [
        "blue",
        "blue_violet",
        "cadet_blue",
        "chocolate",
        "coral",
        "dodger_blue",
        "firebrick",
        "golden_rod",
        "green",
        "hot_pink",
        "orange_red",
        "red",
        "sea_green",
        "spring_green",
        "yellow_green",
    ];

    let color = colors[Math.floor(Math.random() * colors.length)];

    return color;
}

const DEFAULT_COLOR: HelixChatUserColor = "spring_green";
let colorRevertTimer: ReturnType<typeof setTimeout> | null = null;

export async function changeWbColorTemporarily(color: HelixChatUserColor, durationMs: number) {
    if (colorRevertTimer) {
        clearTimeout(colorRevertTimer);
        colorRevertTimer = null;
    }

    await changeWbColor(color);

    colorRevertTimer = setTimeout(async () => {
        colorRevertTimer = null;
        await changeWbColor(DEFAULT_COLOR);
    }, durationMs);
}

export async function changeWbColor(color: HelixChatUserColor) {
    await apiClient.chat.setColorForUser(me.id, color);
    set_wb_color(await apiClient.chat.getColorForUser(me.id));
}
