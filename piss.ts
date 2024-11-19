import { Config, JsonDB } from "node-json-db";

export type PisserResult = {
    pissOccurred: boolean;
    lastDaysSince: number;
};

export abstract class PissStreak {
    static #db = new JsonDB(new Config("./save/pissstreak.json", true, true));
    static readonly #lastpiss_key = "/last_piss";

    static async getDaysSince(): Promise<number> {
        const lastPiss = await this.#db.getObjectDefault<Date>(this.#lastpiss_key, new Date());
        const now = new Date();

        const millisToDays = 1000 * 60 * 60 * 24;
        return Math.floor((Date.now() - lastPiss.getTime()) / millisToDays);
    }

    static async inspectMessageForPisser(message: string): Promise<PisserResult> {
        if (this.impliesPeeingPants(message)) {
            const result = { pissOccurred: true, lastDaysSince: await this.getDaysSince() };
            this.registerLatestPiss();
            return result;
        }

        return { pissOccurred: false, lastDaysSince: 0 };
    }

    private static async registerLatestPiss() {
        await this.#db.push(this.#lastpiss_key, new Date());
    }

    private static impliesPeeingPants(input: string) {
        // Normalize input to lowercase for case-insensitive comparison
        const normalizedInput = input.toLowerCase();

        const phrases = [
            "peed myself",
            "peed my pants",
            "pissed myself",
            "pissed my pants",
            "wet myself",
            "wet my pants",
            "i did a pissigi",
        ];

        // Check if any of the phrases match directly
        if (phrases.some((phrase) => normalizedInput.includes(phrase))) {
            return true;
        }

        // No match found
        return false;
    }
}
