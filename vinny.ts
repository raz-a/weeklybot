import { Config, JsonDB } from "node-json-db";
import { economy } from "./economy.js";
import { broadcast, weeklyBotPrint } from "./util.js";

const VINNY_COOLDOWN_MS = 60 * 1000;
let lastVinnyAt = 0;

const VINNY_SNARKS = [
    "Guys. Nair was there BEFROE Vinny was cool.",
    "Why are we even here? Let's just jump on to Vinny's stream.",
    "Sent a whisper to Vinny to let him know!",
    "Don't forget to check out NairLovesVinny.biz",
    "...",
    "Sending 40 messages to Vinny's chat!",
    "I'm so proud",
    "NAIR PLEASE, IT'S ENOUGH!",
    "I don't think Nair even likes Vinny...",
    "Last time he mentioned Vinny the stream was derailed for FIVE HOURS",
];

export class VinnyCounter {
    #db: JsonDB;
    #countKey: string;

    constructor(filePath: string, countKey = "/count") {
        this.#db = new JsonDB(new Config(filePath, true, true));
        this.#countKey = countKey;
    }

    async increment(): Promise<number> {
        const count = (await this.getCount()) + 1;
        await this.#db.push(this.#countKey, count);
        return count;
    }

    async getCount(): Promise<number> {
        return await this.#db.getObjectDefault<number>(this.#countKey, 0);
    }
}

export const vinnyCounter = new VinnyCounter("./save/vinny.json");

export async function recordVinnyMention(userName: string): Promise<void> {
    const now = Date.now();
    if (now - lastVinnyAt < VINNY_COOLDOWN_MS) {
        return;
    }
    lastVinnyAt = now;

    await economy.ledger.deduct("naircat", 1);
    const count = await vinnyCounter.increment();
    weeklyBotPrint(`[User Command]: ${userName} incremented the Vinny counter to ${count}.`);

    const snark =
        Math.random() < 1 / 20
            ? ` ${VINNY_SNARKS[Math.floor(Math.random() * VINNY_SNARKS.length)]}`
            : "";
    broadcast(`Nair has mentioned Vinny ${count} times. ${snark}`);
}
