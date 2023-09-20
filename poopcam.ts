import { Config, JsonDB } from "node-json-db";

export type PoopCammer = {
    userName: string;
    requestCount: number;
    date: Date;
};

export abstract class PoopCam {
    static #db = new JsonDB(new Config("./save/poopcam.json", true, true));
    static readonly #cammers_key = "/poopcammers";
    static readonly #total_key = "/total_requests";
    static #rate_limit_seconds = 1;

    static async request(userName: string): Promise<boolean> {
        let index = "";
        let cammer: PoopCammer | undefined;
        try {
            cammer = await this.#db.find<PoopCammer>(this.#cammers_key, function (entry, idx) {
                let c = <PoopCammer>entry;
                if (c.userName === userName) {
                    index = idx.toString();
                    return true;
                }

                return false;
            });
        } catch (err) {
            cammer = undefined;
        }

        if (cammer === undefined) {
            cammer = { userName: userName, requestCount: 0, date: new Date(0) };
        }
        let date: Date = new Date();
        let blocked = true;
        if (cammer.date === undefined) {
            blocked = false;
        } else {
            blocked = cammer.date.getTime() + this.#rate_limit_seconds * 1000 > date.getTime();
        }
        if (!blocked) {
            cammer.requestCount++;
        }
        cammer.date = date;
        let key = this.#cammers_key.concat("[", index.toString(), "]");
        await this.#db.push(key, cammer);
        if (!blocked) {
            await this.#db.push(this.#total_key, (await this.getTotalRequests()) + 1);
        }

        return blocked;
    }

    static async getTotalRequests(): Promise<number> {
        return await this.#db.getObjectDefault<number>(this.#total_key, 0);
    }

    static async getTopCammer(): Promise<Readonly<PoopCammer> | undefined> {
        return await this.getCammerByRank(0);
    }

    static async getCammerByRank(rank: number): Promise<Readonly<PoopCammer> | undefined> {
        if (rank < 0) {
            return undefined;
        }

        let cammer_list = await this.load_sorted_cammer_list();
        if (cammer_list === undefined) {
            return undefined;
        }

        return cammer_list.at(rank);
    }

    static async getCammerByName(userName: string): Promise<Readonly<PoopCammer> | undefined> {
        try {
            return await this.#db.find<PoopCammer>(this.#cammers_key, function (entry, idx) {
                let c = <PoopCammer>entry;
                if (c.userName === userName) {
                    return true;
                }

                return false;
            });
        } catch (err) {
            return undefined;
        }
    }

    static async getRankByName(userName: string): Promise<number> {
        let cammer_list = await this.load_sorted_cammer_list();
        if (cammer_list === undefined) {
            return -1;
        }

        return cammer_list.findIndex((c) => c.userName === userName);
    }

    static async getTotalParticipants(): Promise<number> {
        try {
            return await this.#db.count(this.#cammers_key);
        } catch (err) {
            return 0;
        }
    }

    static setRateLimit(limitSeconds: number): boolean {
        if (limitSeconds < 0) {
            return false;
        }

        this.#rate_limit_seconds = limitSeconds;
        return true;
    }

    private static async load_sorted_cammer_list(): Promise<PoopCammer[] | undefined> {
        return (await this.#db.getObjectDefault<PoopCammer[]>(this.#cammers_key, undefined))?.sort(
            function (a, b) {
                return b.requestCount - a.requestCount;
            }
        );
    }
}
