import { describe, it, expect } from "vitest";
import { BurstTracker } from "../burst.js";

describe("BurstTracker", () => {
    it("never reports a burst on a key's first event", () => {
        const tracker = new BurstTracker(5000);
        expect(tracker.record("alice", 1000)).toBe(false);
    });

    it("reports a burst for repeats within the window", () => {
        const tracker = new BurstTracker(5000);
        tracker.record("alice", 1000);
        expect(tracker.record("alice", 5999)).toBe(true); // 4999ms later
    });

    it("treats the window boundary as inclusive", () => {
        const tracker = new BurstTracker(5000);
        tracker.record("alice", 1000);
        expect(tracker.record("alice", 6000)).toBe(true); // exactly 5000ms later
    });

    it("does not report a burst once the window has passed", () => {
        const tracker = new BurstTracker(5000);
        tracker.record("alice", 1000);
        expect(tracker.record("alice", 6001)).toBe(false); // 5001ms later
    });

    it("tracks each key independently", () => {
        const tracker = new BurstTracker(5000);
        tracker.record("alice", 1000);
        expect(tracker.record("bob", 1001)).toBe(false);
    });

    it("measures from the previous event, so a steady stream stays bursting", () => {
        const tracker = new BurstTracker(5000);
        tracker.record("alice", 1000);
        expect(tracker.record("alice", 4000)).toBe(true);
        expect(tracker.record("alice", 7000)).toBe(true);
    });

    it("clears state on reset", () => {
        const tracker = new BurstTracker(5000);
        tracker.record("alice", 1000);
        tracker.reset();
        expect(tracker.record("alice", 2000)).toBe(false);
    });
});
