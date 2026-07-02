// Contains the logic for interacting with twitch client.

import { RefreshingAuthProvider } from "@twurple/auth";
import { ApiClient } from "@twurple/api";
import { ChatClient, PrivateMessage } from "@twurple/chat";
import { promises as fs } from "fs";
import { getConfig } from "./config.js";

export { PrivateMessage } from "@twurple/chat";

// Shared Twitch singletons. They are undefined until initClient() runs, so importing
// this module has NO side effects (no file reads, no network) — that keeps modules
// that depend on it importable in tests. Consumers use these inside functions that
// only run after initClient(), so ESM live bindings hand them the initialised value.
export let apiClient: ApiClient;
export let chatClient: ChatClient;

// Loads credentials and builds the auth provider + Twitch clients. Must be called once
// at startup (from app.ts) before anything uses apiClient / chatClient.
export async function initClient(): Promise<void> {
    const cfg = getConfig();

    const clientInfo = JSON.parse(
        await fs.readFile(cfg.clientInfoPath, { encoding: "utf-8" })
    );
    const tokenData = JSON.parse(await fs.readFile(cfg.tokenPath, { encoding: "utf-8" }));
    const authProvider = new RefreshingAuthProvider(
        {
            clientId: clientInfo.id,
            clientSecret: clientInfo.secret,
            onRefresh: async (newTokenData) =>
                await fs.writeFile(cfg.tokenPath, JSON.stringify(newTokenData, null, 4)),
        },
        tokenData
    );

    apiClient = new ApiClient({ authProvider });
    chatClient = new ChatClient({
        authProvider,
        isAlwaysMod: true,
        botLevel: "known",
    });
}
