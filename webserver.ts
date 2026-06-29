import express, { Express } from "express";
import http, { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { readFileSync } from "fs";

type CommandHandler = (text: string) => Promise<void>;

export type DashboardState = {
    broadcasters: string[];
    relayEnabled: boolean;
    chatGroups: string[][];
};

export type CamData = {
    poopCam: {
        totalRequests: number;
        leaderboard: { userName: string; requestCount: number; rank: number }[];
    };
    pissCam: {
        totalRequests: number;
        leaderboard: { userName: string; requestCount: number; rank: number }[];
    };
    rateLimit: number;
};

export type PissStreakData = {
    daysSince: number;
};

export type FeatureRequestData = {
    requests: { issueNumber: number; requester: string; request: string; date: string; url: string }[];
};

export type DictionaryData = {
    words: string[];
};

export type DictionaryWordData = {
    word: string;
    definitions: string[];
};

// Callback types for dashboard controls
type GetStateCallback = () => Promise<DashboardState>;
type AddBroadcasterCallback = (channel: string) => Promise<boolean>;
type RemoveBroadcasterCallback = (channel: string) => boolean;
type RebootCallback = () => Promise<void>;
type ClipCallback = () => Promise<void>;
type GetPoopCamCallback = () => Promise<CamData>;
type SetRateLimitCallback = (seconds: number) => boolean;
type GetPissStreakCallback = () => Promise<PissStreakData>;
type GetRequestsCallback = () => Promise<FeatureRequestData>;
type DeleteRequestCallback = (issueNumber: number) => Promise<void>;
type GetDictionaryCallback = () => Promise<DictionaryData>;
type GetWordCallback = (word: string) => Promise<DictionaryWordData>;
type AddDefinitionCallback = (word: string, definition: string) => Promise<void>;
type DeleteDefinitionCallback = (word: string, index?: number) => Promise<boolean>;
type GetUserDefinitionsEnabledCallback = () => boolean;
type SetUserDefinitionsEnabledCallback = (enabled: boolean) => void;

export interface DashboardCallbacks {
    getState: GetStateCallback;
    addBroadcaster: AddBroadcasterCallback;
    removeBroadcaster: RemoveBroadcasterCallback;
    reboot: RebootCallback;
    clip: ClipCallback;
    getPoopCam: GetPoopCamCallback;
    setRateLimit: SetRateLimitCallback;
    getPissStreak: GetPissStreakCallback;
    getRequests: GetRequestsCallback;
    deleteRequest: DeleteRequestCallback;
    getDictionary: GetDictionaryCallback;
    getWord: GetWordCallback;
    addDefinition: AddDefinitionCallback;
    deleteDefinition: DeleteDefinitionCallback;
    getUserDefinitionsEnabled: GetUserDefinitionsEnabledCallback;
    setUserDefinitionsEnabled: SetUserDefinitionsEnabledCallback;
}

class WebServer {
    #expressApp: Express;
    #httpServer: HttpServer;
    #io: SocketIOServer;
    #port: number;
    #commandHandler?: CommandHandler;
    #callbacks?: DashboardCallbacks;
    // SHA-256 of the dashboard password (32 bytes), or undefined when no password
    // is configured. Write actions stay locked when undefined.
    #passwordHash?: Buffer;
    // Tokens handed out to authenticated clients so they stay admin across reloads.
    #adminTokens = new Set<string>();

    constructor(port: number = 3000) {
        this.#port = port;
        this.#passwordHash = this.#loadPasswordHash();

        this.#expressApp = express();
        this.#expressApp.use(express.static("webpage"));

        this.#httpServer = http.createServer(this.#expressApp);

        this.#io = new SocketIOServer(this.#httpServer);

        // Mark connections that present a known admin token (issued at login) so a
        // refresh or a second device stays in control without re-entering the password.
        this.#io.use((socket, next) => {
            const token = socket.handshake.auth?.token;
            socket.data.isAdmin = typeof token === "string" && this.#adminTokens.has(token);
            next();
        });

        this.#io.on("connection", (socket: Socket) => {
            this.#registerSocketEvents(socket);
        });

        this.#httpServer.listen(this.#port);
    }

    // Loads and hashes the dashboard password from private/dashboard.json. Reading
    // anything is open to the LAN; only changes require this password.
    #loadPasswordHash(): Buffer | undefined {
        try {
            const { password } = JSON.parse(readFileSync("./private/dashboard.json", "utf-8"));
            if (typeof password === "string" && password.length > 0) {
                return createHash("sha256").update(password).digest();
            }
        } catch {
            // No/invalid file: dashboard stays read-only for everyone.
        }
        console.log("Dashboard: no password set; write controls are locked.");
        return undefined;
    }

    // Constant-time compare of fixed-length hashes so a guess leaks neither match
    // nor length via timing. Returns false when no password is configured.
    #verifyPassword(attempt: unknown): boolean {
        if (!this.#passwordHash || typeof attempt !== "string") {
            return false;
        }
        const attemptHash = createHash("sha256").update(attempt).digest();
        return timingSafeEqual(attemptHash, this.#passwordHash);
    }

    // Server-side gate: the client hiding buttons is cosmetic; this is the real check.
    #requireAdmin(socket: Socket, callback?: (ok: false) => void): boolean {
        if (socket.data.isAdmin) {
            return true;
        }
        callback?.(false);
        return false;
    }

    #registerSocketEvents(socket: Socket) {
        // Tell the client whether this connection already has control (token reuse).
        socket.emit("auth_state", !!socket.data.isAdmin);

        // Exchange the password for control + a token the client can reuse on reconnect.
        socket.on("authenticate", (password: unknown, callback: (res: { ok: boolean; token?: string }) => void) => {
            if (!this.#verifyPassword(password)) {
                callback({ ok: false });
                return;
            }
            const token = randomBytes(32).toString("hex");
            this.#adminTokens.add(token);
            socket.data.isAdmin = true;
            callback({ ok: true, token });
            socket.emit("auth_state", true);
        });

        socket.on("logout", (token: string) => {
            if (typeof token === "string") this.#adminTokens.delete(token);
            socket.data.isAdmin = false;
            socket.emit("auth_state", false);
        });

        // Chat command from the web UI
        socket.on("command", (command: string) => {
            if (!this.#requireAdmin(socket)) return;
            if (this.#commandHandler) {
                this.#commandHandler(command);
            }
        });

        // Dashboard state
        socket.on("get_state", async (callback: (data: DashboardState) => void) => {
            if (this.#callbacks?.getState) {
                const state = await this.#callbacks.getState();
                callback(state);
            }
        });

        // Broadcaster management
        socket.on("add_broadcaster", async (channel: string, callback: (success: boolean) => void) => {
            if (!this.#requireAdmin(socket, callback)) return;
            if (this.#callbacks?.addBroadcaster) {
                const success = await this.#callbacks.addBroadcaster(channel);
                callback(success);
                if (success) {
                    const state = await this.#callbacks.getState();
                    this.#io.emit("broadcasters_updated", state.broadcasters);
                }
            }
        });

        socket.on("remove_broadcaster", async (channel: string, callback: (success: boolean) => void) => {
            if (!this.#requireAdmin(socket, callback)) return;
            if (this.#callbacks?.removeBroadcaster) {
                const success = this.#callbacks.removeBroadcaster(channel);
                callback(success);
                if (success) {
                    const state = await this.#callbacks!.getState();
                    this.#io.emit("broadcasters_updated", state.broadcasters);
                }
            }
        });

        // Reboot
        socket.on("reboot", async () => {
            if (!this.#requireAdmin(socket)) return;
            this.#callbacks?.reboot();
        });

        // Clip
        socket.on("clip", async () => {
            if (!this.#requireAdmin(socket)) return;
            this.#callbacks?.clip();
        });

        // PoopCam
        socket.on("get_poopcam", async (callback: (data: CamData) => void) => {
            if (this.#callbacks?.getPoopCam) {
                callback(await this.#callbacks.getPoopCam());
            }
        });

        socket.on("set_rate_limit", (seconds: number, callback: (success: boolean) => void) => {
            if (!this.#requireAdmin(socket, callback)) return;
            if (this.#callbacks?.setRateLimit) {
                callback(this.#callbacks.setRateLimit(seconds));
            }
        });

        // Piss Streak
        socket.on("get_piss_streak", async (callback: (data: PissStreakData) => void) => {
            if (this.#callbacks?.getPissStreak) {
                callback(await this.#callbacks.getPissStreak());
            }
        });

        // Feature Requests
        socket.on("get_requests", async (callback: (data: FeatureRequestData) => void) => {
            if (this.#callbacks?.getRequests) {
                callback(await this.#callbacks.getRequests());
            }
        });

        socket.on("delete_request", async (issueNumber: number, callback: (success: boolean) => void) => {
            if (!this.#requireAdmin(socket, callback)) return;
            if (this.#callbacks?.deleteRequest) {
                try {
                    await this.#callbacks.deleteRequest(issueNumber);
                    callback(true);
                } catch {
                    callback(false);
                }
            }
        });

        // Meme Dictionary
        socket.on("get_dictionary", async (callback: (data: DictionaryData) => void) => {
            if (this.#callbacks?.getDictionary) {
                callback(await this.#callbacks.getDictionary());
            }
        });

        socket.on("get_word", async (word: string, callback: (data: DictionaryWordData) => void) => {
            if (this.#callbacks?.getWord) {
                callback(await this.#callbacks.getWord(word));
            }
        });

        socket.on("add_definition", async (data: { word: string; definition: string }, callback: (success: boolean) => void) => {
            if (!this.#requireAdmin(socket, callback)) return;
            if (this.#callbacks?.addDefinition) {
                try {
                    await this.#callbacks.addDefinition(data.word, data.definition);
                    callback(true);
                } catch {
                    callback(false);
                }
            }
        });

        socket.on("delete_definition", async (data: { word: string; index?: number }, callback: (success: boolean) => void) => {
            if (!this.#requireAdmin(socket, callback)) return;
            if (this.#callbacks?.deleteDefinition) {
                callback(await this.#callbacks.deleteDefinition(data.word, data.index));
            }
        });

        socket.on("get_user_definitions_enabled", (callback: (enabled: boolean) => void) => {
            if (this.#callbacks?.getUserDefinitionsEnabled) {
                callback(this.#callbacks.getUserDefinitionsEnabled());
            }
        });

        socket.on("set_user_definitions_enabled", (enabled: boolean) => {
            if (!this.#requireAdmin(socket)) return;
            this.#callbacks?.setUserDefinitionsEnabled(enabled);
            this.#io.emit("user_definitions_enabled_updated", enabled);
        });
    }

    onCommand(handler: CommandHandler) {
        this.#commandHandler = handler;
    }

    registerCallbacks(callbacks: DashboardCallbacks) {
        this.#callbacks = callbacks;
    }

    printMessage(msg: String) {
        this.#io.emit("message", msg);
    }

    printChatMessage(displayName: string, color: string, text: string, emotes?: { id: string; start: number; end: number }[]) {
        this.#io.emit("chat_message", { displayName, color, text, emotes: emotes ?? [] });
    }

    // Pushes the current relay state (true when WeeklyBot is relaying itself, false
    // while a Twitch Shared Chat session is handling mirroring) to the dashboard.
    emitRelayState(relayActive: boolean) {
        this.#io.emit("relay_updated", relayActive);
    }

    // Pushes the current chat groups (Shared Chat sessions and standalone channels) to
    // the dashboard. Each inner array is one group of channels that share a chat.
    emitChatGroups(groups: string[][]) {
        this.#io.emit("chat_groups_updated", groups);
    }
}

export const webServer = new WebServer();
