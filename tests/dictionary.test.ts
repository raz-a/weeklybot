import { describe, it, expect } from "vitest";
import { MemeDictionary } from "../dictionary.js";

// Regression guard for the WeWeCoin coin-farm bug: addDefinition must report failure
// (false) for words it refuses to store, so !newdefine can withhold the +5 reward.
// These inputs all fail #normalize and short-circuit before any DB write, so the test
// does not touch the real ./save file.
describe("MemeDictionary.addDefinition validation", () => {
    it("returns false for words with disallowed characters", async () => {
        expect(await MemeDictionary.addDefinition("hello world", "x")).toBe(false);
        expect(await MemeDictionary.addDefinition("bad-word", "x")).toBe(false);
        expect(await MemeDictionary.addDefinition("piss!", "x")).toBe(false);
    });

    it("returns false for an empty word", async () => {
        expect(await MemeDictionary.addDefinition("   ", "x")).toBe(false);
    });

    it("returns false for words longer than 50 characters", async () => {
        expect(await MemeDictionary.addDefinition("a".repeat(51), "x")).toBe(false);
    });
});
