import { Config, JsonDB } from "node-json-db";

export type CoinBalance = {
    userName: string;
    balance: number;
};

// The WeWeCoin ("WeeklyWednesdayCoin") ledger: a dependency-free persistence layer
// (no Twitch client / IO) so the economy rules built on top of it stay unit-testable,
// mirroring the pattern used by cam.ts / sharedchat.ts.
//
// Balances are keyed internally by a normalized (trimmed, lowercased) user name so the
// same viewer is one account regardless of display casing; the latest display name seen
// is preserved for the dashboard. A balance never drops below zero.
export class WeWeCoinLedger {
    #db: JsonDB;
    #rootKey: string;

    constructor(filePath = "./save/wewecoin.json", rootKey = "/balances") {
        this.#db = new JsonDB(new Config(filePath, true, true));
        this.#rootKey = rootKey;
    }

    static #normalize(userName: string): string {
        return userName.trim().toLowerCase();
    }

    async #load(): Promise<Record<string, CoinBalance>> {
        return await this.#db.getObjectDefault<Record<string, CoinBalance>>(this.#rootKey, {});
    }

    async #save(balances: Record<string, CoinBalance>): Promise<void> {
        await this.#db.push(this.#rootKey, balances);
    }

    async getBalance(userName: string): Promise<number> {
        const key = WeWeCoinLedger.#normalize(userName);
        if (!key) {
            return 0;
        }
        const balances = await this.#load();
        return balances[key]?.balance ?? 0;
    }

    // All accounts, sorted richest first (ties broken alphabetically) for leaderboards.
    async getAllBalances(): Promise<CoinBalance[]> {
        const balances = await this.#load();
        return Object.values(balances).sort(
            (a, b) => b.balance - a.balance || a.userName.localeCompare(b.userName)
        );
    }

    // Credits `amount` coins (amount <= 0 is a no-op). Returns the new balance.
    async award(userName: string, amount: number): Promise<number> {
        const key = WeWeCoinLedger.#normalize(userName);
        if (!key || amount <= 0) {
            return this.getBalance(userName);
        }
        const balances = await this.#load();
        const current = balances[key]?.balance ?? 0;
        const next = current + Math.floor(amount);
        balances[key] = { userName: userName.trim(), balance: next };
        await this.#save(balances);
        return next;
    }

    // Debits up to `amount` coins, saturating at zero (never goes negative). Returns the
    // number of coins actually removed, which callers use to honour "only exchange coins
    // the user actually had".
    async deduct(userName: string, amount: number): Promise<number> {
        const key = WeWeCoinLedger.#normalize(userName);
        if (!key || amount <= 0) {
            return 0;
        }
        const balances = await this.#load();
        const current = balances[key]?.balance ?? 0;
        const removed = Math.min(current, Math.floor(amount));
        if (removed <= 0) {
            return 0;
        }
        balances[key] = { userName: userName.trim(), balance: current - removed };
        await this.#save(balances);
        return removed;
    }

    // Moves up to `amount` coins from one account to another, limited by the sender's
    // balance. Returns the number of coins actually moved (0 when the sender is broke).
    async transfer(fromUser: string, toUser: string, amount: number): Promise<number> {
        const moved = await this.deduct(fromUser, amount);
        if (moved > 0) {
            await this.award(toUser, moved);
        }
        return moved;
    }
}

// Shared singleton backed by the real save file. Rules and dashboard callbacks use this;
// tests construct their own WeWeCoinLedger against a temp file.
export const WeWeCoin = new WeWeCoinLedger("./save/wewecoin.json");
