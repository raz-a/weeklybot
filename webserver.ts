import express, { Express } from "express";

type CommandHandler = (text: string) => Promise<void>;

class WebServer {
    #expressApp: Express;
    #port: number;
    #handler?: CommandHandler;

    constructor(port: number = 3000) {
        this.#port = port;

        this.#expressApp = express();
        this.#expressApp.use(express.static("webpage"));

        this.#expressApp.listen(this.#port);
    }

    onCommand(handler: CommandHandler) {
        this.#handler = handler;
    }

    async printMessage(msg: String) {}
}

export const webServer = new WebServer();
