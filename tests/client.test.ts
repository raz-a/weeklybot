import { describe, it, expect } from "vitest";
import * as client from "../client.js";

// Regression test for T1b: importing client.ts must NOT read credentials or build the
// Twitch clients. That import-time side effect is what previously made client.ts (and
// everything importing it) impossible to unit-test without the ./private secrets.
describe("client module import safety", () => {
    it("does not construct clients or read credentials at import time", () => {
        expect(client.apiClient).toBeUndefined();
        expect(client.chatClient).toBeUndefined();
    });

    it("exposes initClient() to build the clients on demand", () => {
        expect(typeof client.initClient).toBe("function");
    });
});
