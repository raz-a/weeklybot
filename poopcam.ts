import saveSystem, { JSONObject } from './saveSystem.js';

export type PoopCammer = {
    userName: string;
    requestCount: number;
};

export abstract class PoopCam {
    static #participants: PoopCammer[] = [];
    static #totalRequests = 0;

    static request(userName: string): void {
        let cammer = this.#participants.find((c) => c.userName === userName);
        if (cammer === undefined) {
            this.#participants.push({ userName: userName, requestCount: 1 });
        } else {
            cammer.requestCount++;
        }
        this.genRecord(userName);
        this.#participants.sort((a, b) => b.requestCount - a.requestCount);
        this.#totalRequests++;
    }

    static async genRecord(userName: string): Promise<void> {
        let cammerJSON = await saveSystem.getRecordFromJSON(userName, 'poopcam');
        let cammer = this.#participants.find((c) => c.userName === userName);
        if (cammer === undefined) return;
        let save: JSONObject;
        if (cammerJSON === null) {
            save = {
                user: userName,
                total: "1",
                highest: "1",
            };
            this.saveRecord(save, userName);
        } else {
            const total = parseInt(cammerJSON.total.toString(), 10) + 1;
            if (parseInt(cammerJSON.highest.toString(), 10) < cammer!.requestCount) {
                const save: JSONObject = {
                    user: userName,
                    total: total.toString(),
                    highest: cammer!.requestCount.toString(),
                };
                this.saveRecord(save, userName);
            } else {
                const save: JSONObject = {
                    user: userName,
                    total: total.toString(),
                    highest: cammerJSON.highest.toString(),
                };
                this.saveRecord(save, userName);
            }
        }
    }

    static async saveRecord(save: JSONObject, userName: string): Promise<void> {
        try {
            saveSystem.saveRecordToJSON(save, 'poopcam', userName);
        } catch (error) {
            console.error(error);
        }
    }

    static getTotalRequests(): number {
        return this.#totalRequests;
    }

    static getTopCammer(): Readonly<PoopCammer> | undefined {
        return this.getCammerByRank(0);
    }

    static getCammerByRank(rank: number): Readonly<PoopCammer> | undefined {
        if (rank < 0) {
            return undefined;
        }

        return this.#participants.at(rank);
    }

    static getCammerByName(userName: string): Readonly<PoopCammer> | undefined {
        return this.#participants.find((c) => c.userName === userName);
    }

    static getRankByName(userName: string): number {
        return this.#participants.findIndex((c) => c.userName === userName);
    }

    static getTotalParticipants(): number {
        return this.#participants.length;
    }
}
