import { describe, it, expect } from "vitest";
import { SharedChatState } from "../sharedchat.js";

// Room ids Twitch would put in the `room-id` / `source-room-id` IRC tags, and the
// broadcaster channels WeeklyBot is connected to. Under the current model grouping is
// driven by whether a session is active, so channel<->room mapping is not needed here.
const RAZ_ROOM = "R";
const NAIR_ROOM = "N";
const channels = ["razstrats", "naircat"];

describe("SharedChatState.isNativeMessage", () => {
    it("treats a message with no source-room-id as native (no session active)", () => {
        expect(SharedChatState.isNativeMessage(RAZ_ROOM, undefined)).toBe(true);
    });

    it("treats the origin channel's own copy (source === room) as native", () => {
        expect(SharedChatState.isNativeMessage(RAZ_ROOM, RAZ_ROOM)).toBe(true);
    });

    it("treats a mirrored copy (source !== room) as non-native", () => {
        expect(SharedChatState.isNativeMessage(NAIR_ROOM, RAZ_ROOM)).toBe(false);
    });
});

describe("SharedChatState session detection", () => {
    it("starts with no active session", () => {
        const s = new SharedChatState();
        expect(s.isActive()).toBe(false);
    });

    it("detects a session from the origin channel's own (native) copy alone", () => {
        // The native copy carries source-room-id === room-id during a session, so a
        // channel's own message is enough — no mirrored copy required.
        const s = new SharedChatState();
        s.record(RAZ_ROOM, RAZ_ROOM);
        expect(s.isActive()).toBe(true);
    });

    it("detects a session (and both rooms) from a mirrored copy", () => {
        const s = new SharedChatState();
        s.record(NAIR_ROOM, RAZ_ROOM);
        expect(s.isActive()).toBe(true);
    });

    it("clears a room's session flag on a non-shared message", () => {
        const s = new SharedChatState();
        s.record(RAZ_ROOM, RAZ_ROOM);
        s.record(RAZ_ROOM, undefined);
        expect(s.isActive()).toBe(false);
    });

    it("ignores messages with no room id", () => {
        const s = new SharedChatState();
        s.record(null, RAZ_ROOM);
        expect(s.isActive()).toBe(false);
    });

    it("expires a session flag after the TTL and keeps it before", () => {
        const s = new SharedChatState(1000);
        s.record(RAZ_ROOM, RAZ_ROOM, 0);
        expect(s.isActive(999)).toBe(true);
        expect(s.isActive(2000)).toBe(false);
    });
});

describe("SharedChatState.groupChannels", () => {
    it("puts each channel in its own group when no session is active", () => {
        const s = new SharedChatState();
        expect(s.groupChannels(channels)).toEqual([["razstrats"], ["naircat"]]);
    });

    it("collapses all channels into one group when a session is active", () => {
        const s = new SharedChatState();
        s.record(RAZ_ROOM, RAZ_ROOM);
        expect(s.groupChannels(channels)).toEqual([["razstrats", "naircat"]]);
    });

    it("returns no groups for no connected channels", () => {
        const s = new SharedChatState();
        expect(s.groupChannels([])).toEqual([]);
        s.record(RAZ_ROOM, RAZ_ROOM);
        expect(s.groupChannels([])).toEqual([]);
    });
});

describe("SharedChatState.broadcastTargets", () => {
    it("targets every channel when no session is active (WeeklyBot bridges)", () => {
        const s = new SharedChatState();
        expect(s.broadcastTargets(channels)).toEqual(["razstrats", "naircat"]);
    });

    it("targets a single representative when a session is active (Twitch fans out)", () => {
        const s = new SharedChatState();
        s.record(RAZ_ROOM, RAZ_ROOM);
        expect(s.broadcastTargets(channels)).toEqual(["razstrats"]);
    });
});

describe("SharedChatState.relayTargets", () => {
    it("relays to every other channel when no session is active", () => {
        const s = new SharedChatState();
        expect(s.relayTargets(channels, "razstrats")).toEqual(["naircat"]);
    });

    it("matches the source channel case-insensitively", () => {
        const s = new SharedChatState();
        expect(s.relayTargets(channels, "RazStrats")).toEqual(["naircat"]);
    });

    it("does not relay while a session is active (Twitch already mirrors)", () => {
        const s = new SharedChatState();
        s.record(RAZ_ROOM, RAZ_ROOM);
        expect(s.relayTargets(channels, "razstrats")).toEqual([]);
    });
});

describe("SharedChatState relay leak regression", () => {
    // Regression for the "leaked relay on the first message of a session" bug: Twitch
    // delivers the origin channel's native copy (room-id=R, source-room-id=R) and a
    // mirrored copy to the peer (room-id=N, source-room-id=R), and WeeklyBot relays
    // while handling the native copy. The old edge-graph model learned the session only
    // from the mirrored copy, so if the native copy was processed first the peer was
    // still seen as a separate group and the message was relayed into it — duplicating
    // Twitch's own mirror. Recording only the native copy must now be enough to suppress
    // the relay.
    it("does not relay into the peer when only the native copy has been seen", () => {
        const s = new SharedChatState();
        s.record(RAZ_ROOM, RAZ_ROOM); // native copy handled before the mirrored copy
        expect(s.relayTargets(channels, "razstrats")).toEqual([]);
        expect(s.broadcastTargets(channels)).toEqual(["razstrats"]);
    });

    it("resumes bridging once the Shared Chat session ends", () => {
        const s = new SharedChatState();
        s.record(RAZ_ROOM, RAZ_ROOM);
        s.record(NAIR_ROOM, RAZ_ROOM);
        expect(s.relayTargets(channels, "razstrats")).toEqual([]);

        // Session ends: both channels now deliver plain, non-shared messages.
        s.record(RAZ_ROOM, undefined);
        s.record(NAIR_ROOM, undefined);
        expect(s.isActive()).toBe(false);
        expect(s.relayTargets(channels, "razstrats")).toEqual(["naircat"]);
        expect(s.broadcastTargets(channels)).toEqual(["razstrats", "naircat"]);
    });
});
