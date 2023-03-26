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

        this.#participants.sort((a, b) => b.requestCount - a.requestCount);
        this.#totalRequests++;
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
