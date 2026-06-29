import { Config, JsonDB } from "node-json-db";

export type Cammer = {
    userName: string;
    requestCount: number;
    date: Date;
};

// A request-counting "cam" leaderboard (PoopCam, PissCam, ...) backed by its own
// node-json-db file. Behaviour is identical across cams; only the storage paths differ.
export class Cam {
    #db: JsonDB;
    #cammersKey: string;
    #totalKey: string;
    #rateLimitSeconds = 1;

    constructor(filePath: string, cammersKey = "/cammers", totalKey = "/total_requests") {
        this.#db = new JsonDB(new Config(filePath, true, true));
        this.#cammersKey = cammersKey;
        this.#totalKey = totalKey;
    }

    async request(userName: string): Promise<boolean> {
        let index = "";
        let cammer: Cammer | undefined;
        try {
            cammer = await this.#db.find<Cammer>(this.#cammersKey, (entry, idx) => {
                if ((entry as Cammer).userName === userName) {
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
        const date = new Date();
        let blocked = true;
        if (cammer.date === undefined) {
            blocked = false;
        } else {
            blocked = cammer.date.getTime() + this.#rateLimitSeconds * 1000 > date.getTime();
        }
        if (!blocked) {
            cammer.requestCount++;
        }
        cammer.date = date;
        const key = this.#cammersKey.concat("[", index.toString(), "]");
        await this.#db.push(key, cammer);
        if (!blocked) {
            await this.#db.push(this.#totalKey, (await this.getTotalRequests()) + 1);
        }

        return blocked;
    }

    async getTotalRequests(): Promise<number> {
        return await this.#db.getObjectDefault<number>(this.#totalKey, 0);
    }

    async getTopCammer(): Promise<Readonly<Cammer> | undefined> {
        return await this.getCammerByRank(0);
    }

    async getCammerByRank(rank: number): Promise<Readonly<Cammer> | undefined> {
        if (rank < 0) {
            return undefined;
        }

        const cammerList = await this.#loadSortedCammerList();
        return cammerList?.at(rank);
    }

    async getCammerByName(userName: string): Promise<Readonly<Cammer> | undefined> {
        try {
            return await this.#db.find<Cammer>(this.#cammersKey, (entry) => {
                return (entry as Cammer).userName === userName;
            });
        } catch (err) {
            return undefined;
        }
    }

    async getRankByName(userName: string): Promise<number> {
        const cammerList = await this.#loadSortedCammerList();
        if (cammerList === undefined) {
            return -1;
        }

        return cammerList.findIndex((c) => c.userName === userName);
    }

    async getTotalParticipants(): Promise<number> {
        try {
            return await this.#db.count(this.#cammersKey);
        } catch (err) {
            return 0;
        }
    }

    setRateLimit(limitSeconds: number): boolean {
        if (limitSeconds < 0) {
            return false;
        }

        this.#rateLimitSeconds = limitSeconds;
        return true;
    }

    async #loadSortedCammerList(): Promise<Cammer[] | undefined> {
        return (await this.#db.getObjectDefault<Cammer[]>(this.#cammersKey, undefined))?.sort(
            (a, b) => b.requestCount - a.requestCount
        );
    }
}
