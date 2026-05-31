// Common utiliy functions.
import { HelixChatUserColor } from "@twurple/api";
import { chatClient, apiClient } from "./client.js";
import {
    getBroadcasterChannels,
    getBroadcasterIdFromChannel,
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

// ── Twitch Shared Chat aware relaying ────────────────────────────────────────
//
// WeeklyBot's connected channels are partitioned into "chat groups". A Twitch
// Shared Chat session forms one group (Twitch natively mirrors messages between
// its participants); every channel that is not in a session is its own singleton
// group. WeeklyBot must therefore:
//   * NOT relay within a group (Twitch already does), and
//   * relay/broadcast BETWEEN groups by posting to a single representative channel
//     of each group (Twitch mirrors that post to the rest of the group).
//
// Groups are discovered dynamically from the `source-room-id` IRC tag that Twitch
// adds to messages during a Shared Chat session, so no manual toggle or polling is
// needed. A message received in room R that carries `source-room-id` S (S != R)
// proves that R and the room S currently share a session, which we record as an
// edge. Connected components of these edges are the groups.

// How long an unrefreshed shared-chat edge is trusted before it is pruned. Acts as
// a backstop for sessions that end while their channels are quiet (an explicit
// non-shared message clears edges immediately).
const SHARED_CHAT_EDGE_TTL_MS = 15 * 60 * 1000;

// Undirected graph of room ids that are currently sharing a chat session.
// edges: roomId -> (neighbourRoomId -> lastSeenEpochMs)
const sharedChatEdges = new Map<string, Map<string, number>>();

function addSharedChatEdge(roomA: string, roomB: string, when: number) {
    if (!sharedChatEdges.has(roomA)) sharedChatEdges.set(roomA, new Map());
    if (!sharedChatEdges.has(roomB)) sharedChatEdges.set(roomB, new Map());
    sharedChatEdges.get(roomA)!.set(roomB, when);
    sharedChatEdges.get(roomB)!.set(roomA, when);
}

function refreshSharedChatEdges(room: string, when: number) {
    const neighbours = sharedChatEdges.get(room);
    if (!neighbours) return;
    for (const neighbour of neighbours.keys()) {
        neighbours.set(neighbour, when);
        sharedChatEdges.get(neighbour)?.set(room, when);
    }
}

function clearSharedChatEdgesFor(room: string) {
    const neighbours = sharedChatEdges.get(room);
    if (!neighbours) return;
    for (const neighbour of neighbours.keys()) {
        const back = sharedChatEdges.get(neighbour);
        back?.delete(room);
        if (back && back.size === 0) sharedChatEdges.delete(neighbour);
    }
    sharedChatEdges.delete(room);
}

function pruneStaleSharedChatEdges() {
    const cutoff = Date.now() - SHARED_CHAT_EDGE_TTL_MS;
    for (const [room, neighbours] of sharedChatEdges) {
        for (const [neighbour, when] of neighbours) {
            if (when < cutoff) {
                neighbours.delete(neighbour);
                sharedChatEdges.get(neighbour)?.delete(room);
            }
        }
        if (neighbours.size === 0) sharedChatEdges.delete(room);
    }
}

// A message is "native" to the room it was received in when it did not originate in
// another channel's Shared Chat room. Only native messages are processed, so a single
// user message is handled exactly once even though Twitch delivers a mirrored copy to
// every participating channel WeeklyBot has joined.
export function isNativeMessage(roomId: string | null, sourceRoomId: string | undefined): boolean {
    return !sourceRoomId || sourceRoomId === roomId;
}

// Records what an incoming message tells us about the current Shared Chat topology.
// `roomId` is the message's `room-id` tag (the channel it was received in) and
// `sourceRoomId` is its `source-room-id` tag (undefined when no session is active).
export function recordSharedChatMessage(roomId: string | null, sourceRoomId: string | undefined) {
    if (!roomId) return;
    const now = Date.now();

    if (!sourceRoomId) {
        // Not part of a Shared Chat session: this room is on its own again.
        clearSharedChatEdgesFor(roomId);
    } else if (sourceRoomId !== roomId) {
        // Mirrored from another room: the two rooms currently share a session.
        addSharedChatEdge(roomId, sourceRoomId, now);
    } else {
        // Native copy during a session: keep the room's known edges alive.
        refreshSharedChatEdges(roomId, now);
    }
}

export function isSharedChatActive(): boolean {
    pruneStaleSharedChatEdges();
    return sharedChatEdges.size > 0;
}

function getRoomId(channel: string): string | undefined {
    return getBroadcasterIdFromChannel(channel)?.id;
}

// Partitions the connected broadcaster channels into groups, where each group is a
// set of channels that currently share a Twitch chat (a Shared Chat session or a lone
// channel). Channels are returned in connection order; the first channel of each group
// is used as its representative for relaying/broadcasting.
export function getChatGroups(): string[][] {
    pruneStaleSharedChatEdges();

    const channels = [...getBroadcasterChannels()];
    const assigned = new Set<string>();
    const groups: string[][] = [];

    for (const channel of channels) {
        if (assigned.has(channel)) continue;

        const roomId = getRoomId(channel);
        // Discover every room reachable from this channel through shared-chat edges.
        const reachableRooms = new Set<string>();
        if (roomId) {
            const queue = [roomId];
            reachableRooms.add(roomId);
            while (queue.length > 0) {
                const current = queue.pop()!;
                for (const neighbour of sharedChatEdges.get(current)?.keys() ?? []) {
                    if (!reachableRooms.has(neighbour)) {
                        reachableRooms.add(neighbour);
                        queue.push(neighbour);
                    }
                }
            }
        }

        // Collect the connected channels whose rooms fall in this component.
        const group: string[] = [];
        for (const candidate of channels) {
            if (assigned.has(candidate)) continue;
            const candidateRoom = getRoomId(candidate);
            if (candidate === channel || (candidateRoom && reachableRooms.has(candidateRoom))) {
                group.push(candidate);
                assigned.add(candidate);
            }
        }

        groups.push(group);
    }

    return groups;
}

// One representative channel per group: posting to each reaches every connected
// channel exactly once (Twitch mirrors within Shared Chat groups).
function getBroadcastTargets(): string[] {
    return getChatGroups().map((group) => group[0]);
}

// Representatives of every group except the one containing `sourceChannel`. Used to
// relay a message to the other groups without echoing it back into its own group
// (which Twitch already mirrors).
function getRelayTargets(sourceChannel: string): string[] {
    const source = sourceChannel.toLowerCase();
    const targets: string[] = [];

    for (const group of getChatGroups()) {
        const containsSource = group.some((channel) => channel.toLowerCase() === source);
        if (!containsSource) {
            targets.push(group[0]);
        }
    }

    return targets;
}

export async function relay(sourceChannel: string, msg: string) {
    var promises: Promise<void>[] = [];

    // Forward to one representative of every other chat group. Channels in the source
    // message's own group already see it (directly, or mirrored by Twitch Shared Chat).
    for (const channel of getRelayTargets(sourceChannel)) {
        promises.push(send(channel, msg));
    }

    await Promise.all(promises);
}

export async function broadcast(msg: string) {
    var promises: Promise<void>[] = [];

    // Post once per chat group so every connected channel sees the message exactly once.
    for (const channel of getBroadcastTargets()) {
        promises.push(send(channel, msg));
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
