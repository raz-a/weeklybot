import { Config, JsonDB } from "node-json-db";

export type FeatureRequest = {
    requester: string;
    request: string;
    date: Date;
};

export abstract class FeatureRequestDB {
    static #db = new JsonDB(new Config("./save/feature_requests.json", true, true));
    static readonly #rootkey = "/requests";

    static async AddNewRequest(requester: string, request: string): Promise<void> {
        let featureRequest: FeatureRequest = {
            requester: requester,
            request: request,
            date: new Date(),
        };

        await this.#db.push(this.#rootkey.concat("[]"), featureRequest);
    }

    static async RemoveRequestByIndex(index: number): Promise<void> {
        await this.#db.delete(this.#rootkey.concat("[", index.toString(), "]"));
    }

    static async GetRequests(): Promise<FeatureRequest[]> {
        return await this.#db.getData(this.#rootkey);
    }
}
