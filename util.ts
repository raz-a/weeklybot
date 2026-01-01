// Common utiliy functions.
import { HelixChatUserColor } from "@twurple/api";
import { chatClient, apiClient } from "./client.js";
import {
    getBroadcasterChannels,
    getBroadcasterIdFromChannel,
    getFirstBroadcasterChannel,
} from "./broadcaster.js";
import { ChatUser } from "@twurple/chat";
import { webServer } from "./webserver.js";

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

let relayEnabled = true;

export function setRelayMode(enabled: boolean) {
    relayEnabled = enabled;
}

export function getRelayMode(): boolean {
    return relayEnabled;
}

export async function relay(sourceChannel: string, msg: string) {
    var promises: Promise<void>[] = [];

    if (getRelayMode()) {
        for (const channel of getBroadcasterChannels()) {
            if (channel != sourceChannel) {
                promises.push(send(channel, msg));
            }
        }
    }

    await Promise.all(promises);
}

export async function broadcast(msg: string) {
    var promises: Promise<void>[] = [];

    if (getRelayMode()) {
        for (const channel of getBroadcasterChannels()) {
            promises.push(send(channel, msg));
        }
    } else {
        promises.push(send(getFirstBroadcasterChannel()!, msg));
    }

    await Promise.all(promises);
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

export async function changeWbColor(color: HelixChatUserColor) {
    await apiClient.chat.setColorForUser(me.id, color);

    set_wb_color(await apiClient.chat.getColorForUser(me.id));
}
