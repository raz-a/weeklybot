import { WeWeCoin, WeWeCoinLedger } from "./wewecoin.js";
import { BurstTracker } from "./burst.js";

// ── Coin amounts (tune the economy here) ──
const POOPCAM_BASE_REWARD = 1;
const POOPCAM_BURST_BONUS = 1; // extra coin for a rapid repeat request
const POOPCAM_BURST_WINDOW_MS = 5000;
const DEFINITION_REQUEST_COST = 1;
const DEFINITION_ADDED_REWARD = 5;
const PISS_RUIN_MIN_PENALTY = 10;
const MESSAGE_LOTTERY_REWARD = 1;

// User actions the economy reacts to. Each variant is emitted from wherever that action
// is handled in the bot; the Economy engine turns it into ledger mutations.
export type EconomyEvent =
    // A counted !poopcam request (one the cam didn't rate-limit). `at` is the event time
    // in epoch ms; it defaults to now and exists mainly so tests can drive the 5s window.
    | { type: "poopcamRequested"; user: string; at?: number }
    // Someone used !define. `author` is who wrote the shown definition, or null when it
    // came from the external dictionary API / a legacy authorless entry.
    | { type: "definitionRequested"; requestor: string; author: string | null }
    // Someone added a meme definition via !newdefine.
    | { type: "definitionAdded"; user: string }
    // A user broke the piss streak. `streakSize` is the streak (in days) that was lost.
    | { type: "pissStreakRuined"; user: string; streakSize: number }
    // A user won the periodic chat-activity lottery (a random draw weighted by how many
    // messages each chatter sent during the window).
    | { type: "messageLotteryWon"; user: string };

export type CoinChange = { userName: string; delta: number };

// The result of applying an event: the per-user coin deltas that actually happened
// (after saturation/transfer rules) plus a human-readable summary for operator logs.
export type EconomyOutcome = {
    changes: CoinChange[];
    description: string;
};

function sameUser(a: string, b: string): boolean {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// The WeWeCoin economy engine. It owns the mapping from user-action events onto ledger
// mutations, keeping that policy in one dependency-free (no Twitch client / IO) place so
// it stays unit-testable and easy to extend.
//
// To add a new earn/spend condition:
//   1. add a variant to EconomyEvent,
//   2. add a private #handle... method that mutates the ledger and returns an outcome,
//   3. add a case for it in record().
// Call sites just emit the new event; nothing else in the bot has to change.
export class Economy {
    #ledger: WeWeCoinLedger;
    // Detects rapid repeat !poopcam requests per user for the burst-bonus rule.
    #poopBurst: BurstTracker;

    constructor(ledger: WeWeCoinLedger, burstWindowMs = POOPCAM_BURST_WINDOW_MS) {
        this.#ledger = ledger;
        this.#poopBurst = new BurstTracker(burstWindowMs);
    }

    // Exposed so callers (and the dashboard) can read balances through the same ledger.
    get ledger(): WeWeCoinLedger {
        return this.#ledger;
    }

    async record(event: EconomyEvent): Promise<EconomyOutcome> {
        switch (event.type) {
            case "poopcamRequested":
                return this.#handlePoopcamRequested(event);
            case "definitionRequested":
                return this.#handleDefinitionRequested(event);
            case "definitionAdded":
                return this.#handleDefinitionAdded(event);
            case "pissStreakRuined":
                return this.#handlePissStreakRuined(event);
            case "messageLotteryWon":
                return this.#handleMessageLotteryWon(event);
        }
    }

    async #handlePoopcamRequested(
        event: Extract<EconomyEvent, { type: "poopcamRequested" }>
    ): Promise<EconomyOutcome> {
        const burst = this.#poopBurst.record(event.user, event.at ?? Date.now());
        const reward = POOPCAM_BASE_REWARD + (burst ? POOPCAM_BURST_BONUS : 0);
        await this.#ledger.award(event.user, reward);
        return {
            changes: [{ userName: event.user, delta: reward }],
            description: `${event.user} earned ${reward} WeWeCoin for a${
                burst ? " rapid" : ""
            } PoopCam request`,
        };
    }

    async #handleDefinitionRequested(
        event: Extract<EconomyEvent, { type: "definitionRequested" }>
    ): Promise<EconomyOutcome> {
        // Asking for your own definition costs nothing (a self-transfer nets to zero).
        if (event.author && sameUser(event.author, event.requestor)) {
            return {
                changes: [],
                description: `${event.requestor} looked up their own definition (no WeWeCoin exchanged)`,
            };
        }

        const spent = await this.#ledger.deduct(event.requestor, DEFINITION_REQUEST_COST);
        if (spent <= 0) {
            return {
                changes: [],
                description: `${event.requestor} asked for a definition but had no WeWeCoin to spend`,
            };
        }

        const changes: CoinChange[] = [{ userName: event.requestor, delta: -spent }];

        if (event.author) {
            await this.#ledger.award(event.author, spent);
            changes.push({ userName: event.author, delta: spent });
            return {
                changes,
                description: `${event.requestor} paid ${spent} WeWeCoin to ${event.author} for a definition`,
            };
        }

        // No author to pay (external/legacy definition): the coin is burned.
        return {
            changes,
            description: `${event.requestor} burned ${spent} WeWeCoin asking for a definition`,
        };
    }

    async #handleDefinitionAdded(
        event: Extract<EconomyEvent, { type: "definitionAdded" }>
    ): Promise<EconomyOutcome> {
        await this.#ledger.award(event.user, DEFINITION_ADDED_REWARD);
        return {
            changes: [{ userName: event.user, delta: DEFINITION_ADDED_REWARD }],
            description: `${event.user} earned ${DEFINITION_ADDED_REWARD} WeWeCoin for adding a definition`,
        };
    }

    async #handlePissStreakRuined(
        event: Extract<EconomyEvent, { type: "pissStreakRuined" }>
    ): Promise<EconomyOutcome> {
        const penalty = Math.max(PISS_RUIN_MIN_PENALTY, Math.floor(event.streakSize));
        const lost = await this.#ledger.deduct(event.user, penalty);
        return {
            changes: lost > 0 ? [{ userName: event.user, delta: -lost }] : [],
            description: `${event.user} ruined the piss streak and lost ${lost} WeWeCoin`,
        };
    }

    async #handleMessageLotteryWon(
        event: Extract<EconomyEvent, { type: "messageLotteryWon" }>
    ): Promise<EconomyOutcome> {
        await this.#ledger.award(event.user, MESSAGE_LOTTERY_REWARD);
        return {
            changes: [{ userName: event.user, delta: MESSAGE_LOTTERY_REWARD }],
            description: `${event.user} won the chat lottery and earned ${MESSAGE_LOTTERY_REWARD} WeWeCoin`,
        };
    }
}

// Shared singleton used by the running bot; tests build their own Economy over a temp
// ledger so the 5s burst window and balances stay deterministic and isolated.
export const economy = new Economy(WeWeCoin);
