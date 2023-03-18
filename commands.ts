import { ChatUser } from "@twurple/chat";
import { weeklyBotPrint } from "./util.js";

type CommandFn = (args: string[], channel?: string, user?: ChatUser) => void;

export class Command {
    readonly name: string;
    readonly desc: string;
    #fn: CommandFn;

    constructor(fn: CommandFn, desc: string) {
        this.name = fn.name.toLowerCase();
        this.desc = desc;
        this.#fn = fn;
    }

    invoke(args: string[], channel?: string, user?: ChatUser): void {
        this.#fn(args, channel, user);
    }
}

export class CommandSet {
    readonly name: string;
    readonly prefix: string;
    #commands: { [key: string]: Command };

    constructor(name: string, prefix: string, ...commands: Command[]) {
        this.name = name;
        this.prefix = prefix;
        this.#commands = {};
        for (const c of commands) {
            this.#commands[c.name] = c;
        }
    }

    processInput(input: string, channel?: string, user?: ChatUser): boolean {
        if (!input.startsWith(this.prefix)) {
            return false;
        }

        const tokens = input.split(" ");
        const command = tokens[0].slice(this.prefix.length).toLowerCase();
        const args = tokens.slice(1);

        if (command in this.#commands) {
            this.#commands[command].invoke(args, channel, user);
            return true;
        }

        return false;
    }

    getCommands(): string[] {
        let commandNames: string[] = [];
        for (const key in this.#commands) {
            commandNames.push(key);
        }

        return commandNames;
    }

    getDescription(command: string): string | undefined {
        if (command.startsWith(this.prefix)) {
            command = command.slice(this.prefix.length);
        }

        if (command in this.#commands) {
            return this.#commands[command].desc;
        }

        return undefined;
    }

    log(msg: string) {
        weeklyBotPrint(`[${this.name}]: ${msg}`);
    }
}
