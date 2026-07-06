import { describe, it, expect, beforeEach } from "vitest";
import { MessageActivityTracker } from "../activity.js";

let tracker: MessageActivityTracker;

beforeEach(() => {
    tracker = new MessageActivityTracker();
});

describe("MessageActivityTracker", () => {
    it("starts empty with no winner", () => {
        expect(tracker.total()).toBe(0);
        expect(tracker.pickWeightedWinner(() => 0)).toBeNull();
    });

    it("counts messages per user", () => {
        tracker.record("alice");
        tracker.record("alice");
        tracker.record("bob");
        expect(tracker.getCount("alice")).toBe(2);
        expect(tracker.getCount("bob")).toBe(1);
        expect(tracker.total()).toBe(3);
    });

    it("counts a user case-insensitively but keeps the latest display name", () => {
        tracker.record("Alice");
        tracker.record("alice");
        expect(tracker.getCount("ALICE")).toBe(2);
        const entries = tracker.entries();
        expect(entries).toHaveLength(1);
        expect(entries[0].userName).toBe("alice");
    });

    it("ignores blank user names", () => {
        tracker.record("   ");
        expect(tracker.total()).toBe(0);
    });

    it("draws the winner weighted by message count", () => {
        tracker.record("alice"); // weight 1  -> range [0.00, 0.25)
        tracker.record("bob");
        tracker.record("bob");
        tracker.record("bob"); // weight 3    -> range [0.25, 1.00)

        // random() * total(=4): 0.0 -> 0.0 (alice), 0.2 -> 0.8 (alice),
        // 0.25 -> 1.0 (bob), 0.99 -> 3.96 (bob).
        expect(tracker.pickWeightedWinner(() => 0.0)).toBe("alice");
        expect(tracker.pickWeightedWinner(() => 0.2)).toBe("alice");
        expect(tracker.pickWeightedWinner(() => 0.25)).toBe("bob");
        expect(tracker.pickWeightedWinner(() => 0.99)).toBe("bob");
    });

    it("returns a valid winner even at the very top of the range", () => {
        tracker.record("alice");
        tracker.record("bob");
        expect(tracker.pickWeightedWinner(() => 0.999999999)).toBe("bob");
    });

    it("clears every count for the next window", () => {
        tracker.record("alice");
        tracker.record("bob");
        tracker.clear();
        expect(tracker.total()).toBe(0);
        expect(tracker.getCount("alice")).toBe(0);
        expect(tracker.pickWeightedWinner(() => 0)).toBeNull();
    });
});
