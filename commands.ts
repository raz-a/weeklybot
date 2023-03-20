import { ChatUser } from "@twurple/chat";
import { weeklyBotPrint } from "./util.js";

type CommandFn<CallingState> = (args: string[], state: CallingState) => void;
type StateValidator<CallingState> = (state: CallingState) => boolean;

export class Command<CallingState> {
    readonly name: string;
    readonly desc: string;
    #fn: CommandFn<CallingState>;

    constructor(fn: CommandFn<CallingState>, desc: string) {
        this.name = fn.name.toLowerCase();
        this.desc = desc;
        this.#fn = fn;
    }

    invoke(args: string[], state: CallingState): void {
        this.#fn(args, state);
    }
}

export class CommandSet<CallingState> {
    readonly name: string;
    readonly prefix: string;
    #stateValidator: StateValidator<CallingState>;
    #commands: { [key: string]: Command<CallingState> };
    constructor(name: string, prefix: string, stateValidator: StateValidator<CallingState> | undefined, ...commands: Command<CallingState>[]) {
        this.name = name;
        this.prefix = prefix;
        this.#stateValidator = (stateValidator !== undefined) ? stateValidator : CommandSet.#allowAllState;

        this.#commands = {};
        for (const c of commands) {
            this.#commands[c.name] = c;
        }
    }

    processInput(input: string, state: CallingState): boolean {
        if (!this.#stateValidator(state) ||!input.startsWith(this.prefix)) {
            return false;
        }

        const tokens = input.split(" ");
        const command = tokens[0].slice(this.prefix.length).toLowerCase();
        const args = tokens.slice(1);

        if (command in this.#commands) {
            this.#commands[command].invoke(args, state);
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

    static #allowAllState<S>(state: S) {
        return true;
    }
}
