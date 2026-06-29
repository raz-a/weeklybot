import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { rmSync } from "fs";
import { Cam } from "../cam.js";

let path: string;
let cam: Cam;

beforeEach(() => {
    path = join(tmpdir(), `cam-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    cam = new Cam(path, "/cammers", "/total");
    cam.setRateLimit(0);
});

afterEach(() => {
    try {
        rmSync(path);
    } catch {}
});

describe("Cam", () => {
    it("counts requests and participants", async () => {
        await cam.request("alice");
        await cam.request("alice");
        await cam.request("bob");
        expect(await cam.getTotalRequests()).toBe(3);
        expect(await cam.getTotalParticipants()).toBe(2);
    });

    it("ranks the top cammer by count", async () => {
        await cam.request("alice");
        await cam.request("bob");
        await cam.request("bob");
        const top = await cam.getTopCammer();
        expect(top?.userName).toBe("bob");
        expect(await cam.getRankByName("alice")).toBe(1);
    });

    it("blocks requests within the rate limit window", async () => {
        cam.setRateLimit(60);
        expect(await cam.request("carol")).toBe(false); // first allowed
        expect(await cam.request("carol")).toBe(true); // blocked, count unchanged
        expect(await cam.getTotalRequests()).toBe(1);
    });

    it("rejects a negative rate limit", () => {
        expect(cam.setRateLimit(-1)).toBe(false);
        expect(cam.setRateLimit(5)).toBe(true);
    });

    it("returns undefined for an out-of-range rank", async () => {
        expect(await cam.getCammerByRank(-1)).toBeUndefined();
        expect(await cam.getCammerByRank(99)).toBeUndefined();
    });
});
