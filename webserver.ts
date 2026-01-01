import express, { Express } from "express";
import http, { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

type CommandHandler = (text: string) => Promise<void>;

class WebServer {
    #expressApp: Express;
    #httpServer: HttpServer;
    #io: SocketIOServer;
    #port: number;
    #handler?: CommandHandler;

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
            socket.on("command", (command: string) => {
                if (this.#handler) {
                    this.#handler(command);
                }
            });
        });

        this.#httpServer.listen(this.#port);
    }

    onCommand(handler: CommandHandler) {
        this.#handler = handler;
    }

    printMessage(msg: String) {
        this.#io.emit("message", msg);
    }
}

export const webServer = new WebServer();
