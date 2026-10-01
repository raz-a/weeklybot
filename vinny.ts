import { Config, JsonDB } from "node-json-db";

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
