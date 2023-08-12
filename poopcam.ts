import { Config, JsonDB } from "node-json-db";

export type PoopCammer = {
    userName: string;
    requestCount: number;
};

export abstract class PoopCam {
    static #db = new JsonDB(new Config('./save/poopcam.json', true, true));
    static readonly #cammers_key = "/poopcammers";
    static readonly #total_key = "/total_requests";

    static async request(userName: string): Promise<void> {

        let key = this.#cammers_key.concat('/', userName);
        let cammer = await this.#db.getObjectDefault<PoopCammer>(key, { userName: userName, requestCount: 0 });
        cammer.requestCount++;
        await this.#db.push(key, cammer);
        await this.#db.push(this.#total_key, (await this.getTotalRequests()) + 1);
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

        let cammer_list = await this.get_sorted_list();
        if (cammer_list === undefined) {
            return undefined;
        }

        return cammer_list.at(rank);
    }

    static async getCammerByName(userName: string): Promise<Readonly<PoopCammer> | undefined> {
        let key = this.#cammers_key.concat('/', userName);
        if (await this.#db.exists(key) === false) {
            return undefined;
        }

        return await this.#db.getObject<PoopCammer>(key);
    }

    static async getRankByName(userName: string): Promise<number> {

        let cammer_list = await this.get_sorted_list();
        if (cammer_list === undefined) {
            return -1
        }

        return cammer_list.findIndex((c) => c.userName === userName);
    }

    static async getTotalParticipants(): Promise<number> {
        let cammer_list = await this.get_sorted_list();
        if (cammer_list === undefined) {
            return 0;
        }
        return cammer_list.length;
    }

    private static async get_sorted_list(): Promise<PoopCammer[] | undefined> {
        try {

            let cammerList: PoopCammer[] = [];

            // todo
            let cammers = await this.#db.getData(this.#cammers_key);
            for (const c in cammers) {
                let cammer = <PoopCammer>cammers[c];
                cammerList.push(cammer)
            }

            return cammerList.sort(function(a,b) {
                return b.requestCount - a.requestCount
            });

        } catch (err) {
            return undefined;
        }
    }
}
