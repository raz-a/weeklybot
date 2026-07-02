import { describe, it, expect, afterEach } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { writeFileSync, rmSync } from "fs";
import { loadConfig, getConfig } from "../config.js";

let tempPath: string | undefined;

afterEach(() => {
    if (tempPath) {
        try {
            rmSync(tempPath);
        } catch {}
        tempPath = undefined;
    }
    // Reset the cached config back to defaults for the next test.
    loadConfig("this-file-does-not-exist.json");
});

describe("config", () => {
    it("falls back to defaults when the config file is missing", () => {
        const cfg = loadConfig(join(tmpdir(), "wchat-missing-config.json"));
        expect(cfg.defaultChannels).toEqual(["razstrats", "naircat"]);
        expect(cfg.protectedChannel).toBe("razstrats");
        expect(cfg.webPort).toBe(3000);
        expect(cfg.clientInfoPath).toBe("./private/clientinfo.json");
    });

    it("layers overrides from the file on top of the defaults", () => {
        tempPath = join(tmpdir(), `wchat-config-${Date.now()}.json`);
        writeFileSync(tempPath, JSON.stringify({ webPort: 4321, defaultChannels: ["alice", "bob"] }));

        const cfg = loadConfig(tempPath);
        expect(cfg.webPort).toBe(4321);
        expect(cfg.defaultChannels).toEqual(["alice", "bob"]);
        // Unspecified keys keep their default values.
        expect(cfg.protectedChannel).toBe("razstrats");
    });

    it("ignores an invalid config file and uses defaults", () => {
        tempPath = join(tmpdir(), `wchat-config-bad-${Date.now()}.json`);
        writeFileSync(tempPath, "{ not valid json");
        const cfg = loadConfig(tempPath);
        expect(cfg.webPort).toBe(3000);
    });

    it("getConfig returns the most recently loaded config", () => {
        tempPath = join(tmpdir(), `wchat-config-get-${Date.now()}.json`);
        writeFileSync(tempPath, JSON.stringify({ webPort: 5555 }));
        loadConfig(tempPath);
        expect(getConfig().webPort).toBe(5555);
    });
});
