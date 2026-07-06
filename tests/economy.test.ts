import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { rmSync } from "fs";
import { WeWeCoinLedger } from "../wewecoin.js";
import { Economy } from "../economy.js";

let path: string;
let ledger: WeWeCoinLedger;
let economy: Economy;

beforeEach(() => {
    path = join(tmpdir(), `economy-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    ledger = new WeWeCoinLedger(path, "/balances");
    economy = new Economy(ledger, 5000);
});

afterEach(() => {
    try {
        rmSync(path);
    } catch {}
});

describe("Economy — poopcam", () => {
    it("awards 1 coin for a single request", async () => {
        await economy.record({ type: "poopcamRequested", user: "alice", at: 1000 });
        expect(await ledger.getBalance("alice")).toBe(1);
    });

    it("awards 2 coins for a rapid repeat within 5s", async () => {
        await economy.record({ type: "poopcamRequested", user: "alice", at: 1000 });
        await economy.record({ type: "poopcamRequested", user: "alice", at: 3000 });
        expect(await ledger.getBalance("alice")).toBe(3); // 1 + 2
    });

    it("awards only 1 coin again once the burst window passes", async () => {
        await economy.record({ type: "poopcamRequested", user: "alice", at: 1000 });
        await economy.record({ type: "poopcamRequested", user: "alice", at: 7000 });
        expect(await ledger.getBalance("alice")).toBe(2); // 1 + 1
    });
});

describe("Economy — definitions", () => {
    it("awards 5 coins for adding a definition", async () => {
        await economy.record({ type: "definitionAdded", user: "alice" });
        expect(await ledger.getBalance("alice")).toBe(5);
    });

    it("transfers a coin from the requestor to the author", async () => {
        await ledger.award("alice", 2);
        const outcome = await economy.record({
            type: "definitionRequested",
            requestor: "alice",
            author: "bob",
        });
        expect(await ledger.getBalance("alice")).toBe(1);
        expect(await ledger.getBalance("bob")).toBe(1);
        expect(outcome.changes).toEqual([
            { userName: "alice", delta: -1 },
            { userName: "bob", delta: 1 },
        ]);
    });

    it("burns the coin when the definition has no author", async () => {
        await ledger.award("alice", 2);
        await economy.record({ type: "definitionRequested", requestor: "alice", author: null });
        expect(await ledger.getBalance("alice")).toBe(1);
    });

    it("exchanges nothing when the requestor is broke", async () => {
        await economy.record({ type: "definitionRequested", requestor: "alice", author: "bob" });
        expect(await ledger.getBalance("alice")).toBe(0);
        expect(await ledger.getBalance("bob")).toBe(0);
    });

    it("does not charge for looking up your own definition", async () => {
        await ledger.award("alice", 2);
        await economy.record({ type: "definitionRequested", requestor: "alice", author: "Alice" });
        expect(await ledger.getBalance("alice")).toBe(2);
    });
});

describe("Economy — piss streak", () => {
    it("charges the 10-coin minimum for a small streak", async () => {
        await ledger.award("alice", 50);
        await economy.record({ type: "pissStreakRuined", user: "alice", streakSize: 3 });
        expect(await ledger.getBalance("alice")).toBe(40);
    });

    it("charges the streak size when it exceeds the minimum", async () => {
        await ledger.award("alice", 50);
        await economy.record({ type: "pissStreakRuined", user: "alice", streakSize: 25 });
        expect(await ledger.getBalance("alice")).toBe(25);
    });

    it("saturates at zero when the penalty exceeds the balance", async () => {
        await ledger.award("alice", 4);
        const outcome = await economy.record({
            type: "pissStreakRuined",
            user: "alice",
            streakSize: 3,
        });
        expect(await ledger.getBalance("alice")).toBe(0);
        expect(outcome.changes).toEqual([{ userName: "alice", delta: -4 }]);
    });
});

describe("Economy — message lottery", () => {
    it("awards 1 coin to the lottery winner", async () => {
        const outcome = await economy.record({ type: "messageLotteryWon", user: "alice" });
        expect(await ledger.getBalance("alice")).toBe(1);
        expect(outcome.changes).toEqual([{ userName: "alice", delta: 1 }]);
    });

    it("accumulates across repeated wins", async () => {
        await economy.record({ type: "messageLotteryWon", user: "alice" });
        await economy.record({ type: "messageLotteryWon", user: "alice" });
        expect(await ledger.getBalance("alice")).toBe(2);
    });
});
