import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { rmSync } from "fs";
import { WeWeCoinLedger } from "../wewecoin.js";

let path: string;
let ledger: WeWeCoinLedger;

beforeEach(() => {
    path = join(tmpdir(), `wewecoin-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    ledger = new WeWeCoinLedger(path, "/balances");
});

afterEach(() => {
    try {
        rmSync(path);
    } catch {}
});

describe("WeWeCoinLedger", () => {
    it("starts everyone at zero", async () => {
        expect(await ledger.getBalance("alice")).toBe(0);
    });

    it("awards coins and accumulates", async () => {
        await ledger.award("alice", 1);
        await ledger.award("alice", 5);
        expect(await ledger.getBalance("alice")).toBe(6);
    });

    it("treats user names case-insensitively but keeps the latest display name", async () => {
        await ledger.award("Alice", 3);
        await ledger.award("alice", 2);
        expect(await ledger.getBalance("ALICE")).toBe(5);
        const all = await ledger.getAllBalances();
        expect(all).toHaveLength(1);
        expect(all[0].userName).toBe("alice");
    });

    it("ignores non-positive awards", async () => {
        await ledger.award("alice", 0);
        await ledger.award("alice", -5);
        expect(await ledger.getBalance("alice")).toBe(0);
    });

    it("deducts and reports how many coins were actually removed", async () => {
        await ledger.award("alice", 3);
        expect(await ledger.deduct("alice", 2)).toBe(2);
        expect(await ledger.getBalance("alice")).toBe(1);
    });

    it("saturates deductions at zero and reports the partial amount removed", async () => {
        await ledger.award("alice", 3);
        expect(await ledger.deduct("alice", 10)).toBe(3);
        expect(await ledger.getBalance("alice")).toBe(0);
    });

    it("removes nothing from a broke account", async () => {
        expect(await ledger.deduct("alice", 5)).toBe(0);
        expect(await ledger.getBalance("alice")).toBe(0);
    });

    it("transfers only coins the sender actually has", async () => {
        await ledger.award("alice", 1);
        const moved = await ledger.transfer("alice", "bob", 1);
        expect(moved).toBe(1);
        expect(await ledger.getBalance("alice")).toBe(0);
        expect(await ledger.getBalance("bob")).toBe(1);
    });

    it("moves no coins when the sender is broke", async () => {
        const moved = await ledger.transfer("alice", "bob", 5);
        expect(moved).toBe(0);
        expect(await ledger.getBalance("alice")).toBe(0);
        expect(await ledger.getBalance("bob")).toBe(0);
    });

    it("ranks balances richest first", async () => {
        await ledger.award("alice", 2);
        await ledger.award("bob", 9);
        await ledger.award("carol", 5);
        const all = await ledger.getAllBalances();
        expect(all.map((b) => b.userName)).toEqual(["bob", "carol", "alice"]);
    });
});
