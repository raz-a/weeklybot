// Central configuration for WeeklyBot.
//
// Kept dependency-free (only reads a JSON file on demand) so it can be imported
// anywhere — including tests — without side effects. Values default to the current
// hardcoded behaviour; an optional ./private/config.json can override any of them,
// e.g. to run against different channels or ports without editing code.

import { readFileSync } from "fs";

export interface BotConfig {
    // Channels WeeklyBot joins automatically on (re)connect.
    defaultChannels: string[];
    // A channel that must never be removed via removeBroadcaster.
    protectedChannel: string;
    // Paths to the (gitignored) secret files, relative to the repo root (cwd).
    clientInfoPath: string;
    tokenPath: string;
    dashboardPasswordPath: string;
    // Port the web dashboard listens on.
    webPort: number;
}

const defaults: BotConfig = {
    defaultChannels: ["razstrats", "naircat"],
    protectedChannel: "razstrats",
    clientInfoPath: "./private/clientinfo.json",
    tokenPath: "./private/token.json",
    dashboardPasswordPath: "./private/dashboard.json",
    webPort: 3000,
};

let current: BotConfig = defaults;

// Loads configuration, layering any overrides found in `path` on top of the defaults.
// A missing or invalid file is not an error — the defaults are used. Returns (and
// caches) the resulting config so later getConfig() calls see it.
export function loadConfig(path: string = "./private/config.json"): BotConfig {
    try {
        const raw = readFileSync(path, "utf-8");
        const overrides = JSON.parse(raw) as Partial<BotConfig>;
        current = { ...defaults, ...overrides };
    } catch {
        current = { ...defaults };
    }
    return current;
}

// The active configuration (defaults until loadConfig() is called).
export function getConfig(): BotConfig {
    return current;
}
