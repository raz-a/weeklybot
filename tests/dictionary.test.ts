import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { define_word, MemeDictionary } from "../dictionary.js";
import { weeklyBotPrint } from "../util.js";

vi.mock("../util.js", () => ({ weeklyBotPrint: vi.fn() }));

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe("define_word", () => {
    beforeEach(() => {
        vi.spyOn(MemeDictionary, "getDefinitionEntries").mockResolvedValue([]);
    });

    it("merges meme definitions with every API sense and nested subsense", async () => {
        vi.mocked(MemeDictionary.getDefinitionEntries).mockResolvedValue([
            { text: "A meme greeting", author: "alice" },
        ]);
        const fetchMock = vi.fn().mockResolvedValue(Response.json({
            entries: [
                { senses: [
                    { definition: "A greeting", subsenses: [
                        { definition: "On the telephone", subsenses: [] },
                    ] },
                    { definition: "An expression of surprise", subsenses: [] },
                ] },
                { senses: [{ definition: "To greet", subsenses: [] }] },
            ],
        }));
        vi.stubGlobal("fetch", fetchMock);

        expect(await define_word("hello")).toEqual([
            { text: "A meme greeting", author: "alice" },
            { text: '"A greeting"', author: null },
            { text: '"On the telephone"', author: null },
            { text: '"An expression of surprise"', author: null },
            { text: '"To greet"', author: null },
        ]);
        expect(fetchMock).toHaveBeenCalledWith(
            "https://freedictionaryapi.com/api/v1/entries/en/hello",
            { signal: expect.any(AbortSignal) }
        );
    });

    it("returns no definitions immediately for an empty entries response", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ entries: [] })));
        expect(await define_word("qzxvplmoknonsense")).toEqual([]);
    });

    it("encodes the word as a single URL path segment", async () => {
        const fetchMock = vi.fn().mockResolvedValue(Response.json({ entries: [] }));
        vi.stubGlobal("fetch", fetchMock);
        await define_word("a/b?#");
        expect(fetchMock).toHaveBeenCalledWith(
            "https://freedictionaryapi.com/api/v1/entries/en/a%2Fb%3F%23",
            expect.any(Object)
        );
    });

    it("aborts a stalled lookup after two seconds and keeps local definitions", async () => {
        vi.useFakeTimers();
        vi.mocked(MemeDictionary.getDefinitionEntries).mockResolvedValue([
            { text: "Local definition", author: "alice" },
        ]);
        let signal: AbortSignal | undefined;
        vi.stubGlobal("fetch", vi.fn((_url, options: RequestInit) => {
            signal = options.signal ?? undefined;
            return new Promise((_resolve, reject) => {
                signal?.addEventListener("abort", () => reject(signal?.reason), { once: true });
            });
        }));
        const lookup = define_word("hello");
        await vi.advanceTimersByTimeAsync(1999);
        expect(signal?.aborted).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect(await lookup).toEqual([{ text: "Local definition", author: "alice" }]);
        expect(signal?.aborted).toBe(true);
        expect(weeklyBotPrint).toHaveBeenCalledWith(expect.stringContaining("hello"));
    });

    it.each([
        ["HTTP failure", () => new Response("", { status: 503 })],
        ["missing entries", () => Response.json({})],
        ["invalid sense", () => Response.json({ entries: [{ senses: [{ definition: 42 }] }] })],
        ["invalid JSON", () => new Response("{")],
    ])("reports %s instead of treating it as an unknown word", async (_name, response) => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response()));
        await expect(define_word("hello")).rejects.toThrow();
    });

    it("keeps local definitions and logs a network failure", async () => {
        vi.mocked(MemeDictionary.getDefinitionEntries).mockResolvedValue([
            { text: "Local definition", author: "alice" },
        ]);
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network unavailable")));
        expect(await define_word("hello")).toEqual([{ text: "Local definition", author: "alice" }]);
        expect(weeklyBotPrint).toHaveBeenCalledWith(expect.stringContaining("Network unavailable"));
    });
});

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
