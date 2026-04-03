import express, { Express } from "express";
import http, { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

type CommandHandler = (text: string) => Promise<void>;

export type DashboardState = {
    broadcasters: string[];
    relayEnabled: boolean;
};

export type PoopCamData = {
    totalRequests: number;
    rateLimit: number;
    leaderboard: { userName: string; requestCount: number; rank: number }[];
};

export type PissStreakData = {
    daysSince: number;
};

export type FeatureRequestData = {
    requests: { index: number; requester: string; request: string; date: string }[];
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
type ToggleRelayCallback = (enabled: boolean) => void;
type AddBroadcasterCallback = (channel: string) => Promise<boolean>;
type RemoveBroadcasterCallback = (channel: string) => boolean;
type RebootCallback = () => Promise<void>;
type GetPoopCamCallback = () => Promise<PoopCamData>;
type SetRateLimitCallback = (seconds: number) => boolean;
type GetPissStreakCallback = () => Promise<PissStreakData>;
type GetRequestsCallback = () => Promise<FeatureRequestData>;
type DeleteRequestCallback = (index: number) => Promise<void>;
type GetDictionaryCallback = () => Promise<DictionaryData>;
type GetWordCallback = (word: string) => Promise<DictionaryWordData>;
type AddDefinitionCallback = (word: string, definition: string) => Promise<void>;
type DeleteDefinitionCallback = (word: string, index?: number) => Promise<boolean>;

export interface DashboardCallbacks {
    getState: GetStateCallback;
    toggleRelay: ToggleRelayCallback;
    addBroadcaster: AddBroadcasterCallback;
    removeBroadcaster: RemoveBroadcasterCallback;
    reboot: RebootCallback;
    getPoopCam: GetPoopCamCallback;
    setRateLimit: SetRateLimitCallback;
    getPissStreak: GetPissStreakCallback;
    getRequests: GetRequestsCallback;
    deleteRequest: DeleteRequestCallback;
    getDictionary: GetDictionaryCallback;
    getWord: GetWordCallback;
    addDefinition: AddDefinitionCallback;
    deleteDefinition: DeleteDefinitionCallback;
}

class WebServer {
    #expressApp: Express;
    #httpServer: HttpServer;
    #io: SocketIOServer;
    #port: number;
    #commandHandler?: CommandHandler;
    #callbacks?: DashboardCallbacks;

    constructor(port: number = 3000) {
        this.#port = port;

        this.#expressApp = express();
        this.#expressApp.use(express.static("webpage"));

        this.#httpServer = http.createServer(this.#expressApp);

        this.#io = new SocketIOServer(this.#httpServer, {
            cors: {
                origin: "https://weeklybot.lan",
            },
        });

        this.#io.on("connection", (socket: Socket) => {
            this.#registerSocketEvents(socket);
        });

        this.#httpServer.listen(this.#port);
    }

    #registerSocketEvents(socket: Socket) {
        // Chat command from the web UI
        socket.on("command", (command: string) => {
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

        // Relay toggle
        socket.on("toggle_relay", (enabled: boolean) => {
            this.#callbacks?.toggleRelay(enabled);
            this.#io.emit("relay_updated", enabled);
        });

        // Broadcaster management
        socket.on("add_broadcaster", async (channel: string, callback: (success: boolean) => void) => {
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
            this.#callbacks?.reboot();
        });

        // PoopCam
        socket.on("get_poopcam", async (callback: (data: PoopCamData) => void) => {
            if (this.#callbacks?.getPoopCam) {
                callback(await this.#callbacks.getPoopCam());
            }
        });

        socket.on("set_rate_limit", (seconds: number, callback: (success: boolean) => void) => {
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

        socket.on("delete_request", async (index: number, callback: (success: boolean) => void) => {
            if (this.#callbacks?.deleteRequest) {
                try {
                    await this.#callbacks.deleteRequest(index);
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
            if (this.#callbacks?.deleteDefinition) {
                callback(await this.#callbacks.deleteDefinition(data.word, data.index));
            }
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

    printChatMessage(displayName: string, color: string, text: string) {
        this.#io.emit("chat_message", { displayName, color, text });
    }
}

export const webServer = new WebServer();
