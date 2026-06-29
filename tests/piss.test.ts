import { describe, it, expect } from "vitest";
import { PissStreak } from "../piss.js";

describe("PissStreak.inspectMessageForPisser", () => {
    it("ignores normal messages", async () => {
        const r = await PissStreak.inspectMessageForPisser("hello chat how are you");
        expect(r.pissOccurred).toBe(false);
    });

    it("detects pissing phrases case-insensitively", async () => {
        const r = await PissStreak.inspectMessageForPisser("haha I PISSED MYSELF");
        expect(r.pissOccurred).toBe(true);
    });

    it("does not match unrelated words containing pee", async () => {
        const r = await PissStreak.inspectMessageForPisser("speed running is fun");
        expect(r.pissOccurred).toBe(false);
    });
});
