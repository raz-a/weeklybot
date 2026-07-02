// ── Twitch Shared Chat topology ──────────────────────────────────────────────
//
// Twitch "Shared Chat" natively mirrors every message between the channels in a
// session, so if WeeklyBot ALSO relayed between those channels each message would
// appear twice. This module tracks which channels are currently in a Shared Chat
// session and partitions the connected channels into "chat groups" accordingly.
// Posting once to a representative channel of each group reaches every connected
// channel exactly once.
//
// It is deliberately free of any Twitch client / IO dependency (it works purely on
// channel names, room ids, and timestamps) so the grouping logic can be unit-tested
// in isolation — see tests/sharedchat.test.ts.
//
// Detection relies on the `source-room-id` IRC tag Twitch stamps on EVERY delivered
// copy of a message during a session, INCLUDING the copy delivered to the origin
// channel (where `source-room-id === room-id`). That is the key to avoiding a
// duplicated relay: a channel's own (native) message is enough to know a session is
// active, without having to first observe a mirrored copy in another channel.

// How long a room is trusted to still be in a session after its last shared-chat
// message, before the flag is pruned. Acts as a backstop for sessions that end while
// a channel is quiet; an explicit non-shared message clears the flag immediately.
export const SHARED_CHAT_SESSION_TTL_MS = 15 * 60 * 1000;

export class SharedChatState {
    // roomId -> last epoch-ms we saw that room carrying a `source-room-id` tag, i.e.
    // participating in a Shared Chat session.
    #sessionRooms = new Map<string, number>();
    readonly #ttlMs: number;

    constructor(ttlMs: number = SHARED_CHAT_SESSION_TTL_MS) {
        this.#ttlMs = ttlMs;
    }

    // A message is "native" to the room it was received in unless it originated in
    // another room's Shared Chat session. Only native messages should be processed, so
    // a single user message is handled exactly once even though Twitch delivers a
    // mirrored copy to every participating channel WeeklyBot has joined.
    static isNativeMessage(roomId: string | null, sourceRoomId: string | undefined): boolean {
        return !sourceRoomId || sourceRoomId === roomId;
    }

    // Learn the current Shared Chat topology from one delivered copy of a message.
    // `roomId` is the message's `room-id` tag (the channel it was received in) and
    // `sourceRoomId` is its `source-room-id` tag (undefined when no session is active).
    record(roomId: string | null, sourceRoomId: string | undefined, now: number = Date.now()): void {
        if (!roomId) return;

        if (!sourceRoomId) {
            // No session tag on this message: the room is not in a Shared Chat session.
            this.#sessionRooms.delete(roomId);
            return;
        }

        // A session tag is present, so this room is in a session — true even for the
        // native copy (`sourceRoomId === roomId`). A mirrored copy additionally proves
        // the origin room is in a session too.
        this.#sessionRooms.set(roomId, now);
        if (sourceRoomId !== roomId) {
            this.#sessionRooms.set(sourceRoomId, now);
        }
    }

    #prune(now: number): void {
        const cutoff = now - this.#ttlMs;
        for (const [room, seen] of this.#sessionRooms) {
            if (seen < cutoff) this.#sessionRooms.delete(room);
        }
    }

    // True while any connected room is in a Shared Chat session (within the TTL).
    isActive(now: number = Date.now()): boolean {
        this.#prune(now);
        return this.#sessionRooms.size > 0;
    }

    // Partition the connected channels into chat groups.
    //   * While a Shared Chat session is active, Twitch mirrors messages between the
    //     participating channels, so they collapse into ONE group and WeeklyBot posts a
    //     single copy that Twitch fans out — never relaying between them itself.
    //   * Otherwise each channel is isolated and forms its own singleton group, so
    //     WeeklyBot bridges them.
    // The first channel of each group is its representative for relaying/broadcasting.
    groupChannels(channels: Iterable<string>, now: number = Date.now()): string[][] {
        const list = [...channels];
        if (this.isActive(now)) {
            return list.length > 0 ? [list] : [];
        }
        return list.map((channel) => [channel]);
    }

    // One representative channel per group: posting to each reaches every connected
    // channel exactly once.
    broadcastTargets(channels: Iterable<string>, now: number = Date.now()): string[] {
        return this.groupChannels(channels, now).map((group) => group[0]);
    }

    // Representatives of every group EXCEPT the one containing `sourceChannel`. Used to
    // relay a message to the other groups without echoing it back into its own group
    // (which the channel already sees directly, or via Twitch's Shared Chat mirror).
    relayTargets(channels: Iterable<string>, sourceChannel: string, now: number = Date.now()): string[] {
        const source = sourceChannel.toLowerCase();
        const targets: string[] = [];
        for (const group of this.groupChannels(channels, now)) {
            const containsSource = group.some((channel) => channel.toLowerCase() === source);
            if (!containsSource) {
                targets.push(group[0]);
            }
        }
        return targets;
    }
}
