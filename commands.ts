import { weeklyBotPrint } from "./util.js";

type CommandFn<CallingState> = (args: string[], state: CallingState) => void | Promise<void>;
type StateValidator<CallingState> = (state: CallingState) => Promise<boolean>;

export class Command<CallingState> {
    readonly name: string;
    readonly desc: string;
    #fn: CommandFn<CallingState>;

    constructor(fn: CommandFn<CallingState>, desc: string) {
        this.name = fn.name.toLowerCase();
        this.desc = desc;
        this.#fn = fn;
    }

    async invoke(args: string[], state: CallingState): Promise<void> {
        try {
            await this.#fn(args, state);
        } catch (err) {
            weeklyBotPrint(`Command "${this.name}" failed: ${err}`);
        }
    }
}

export class CommandSet<CallingState> {
    readonly name: string;
    readonly prefix: string;
    #stateValidator: StateValidator<CallingState>;
    #commands: { [key: string]: Command<CallingState> };
    constructor(
        name: string,
        prefix: string,
        stateValidator: StateValidator<CallingState> | undefined,
        ...commands: Command<CallingState>[]
    ) {
        this.name = name;
        this.prefix = prefix;
        this.#stateValidator =
            stateValidator !== undefined ? stateValidator : CommandSet.#allowAllState;

        this.#commands = {};
        for (const c of commands) {
            this.#commands[c.name] = c;
        }
    }

    async processInput(input: string, state: CallingState) {
        try {
            if (!(await this.#stateValidator(state)) || !input.startsWith(this.prefix)) {
                return false;
            }
        } catch (err) {
            weeklyBotPrint(`[${this.name}] state validation failed: ${err}`);
            return false;
        }

        const tokens = input.split(" ");
        const command = tokens[0].slice(this.prefix.length).toLowerCase();
        const args = tokens.slice(1);

        if (command in this.#commands) {
            await this.#commands[command].invoke(args, state);
            return true;
        }

        return false;
    }

    getCommands(): string[] {
        let commandNames: string[] = [];
        for (const key in this.#commands) {
            if (this.#commands[key].desc.length != 0) {
                commandNames.push(key);
            }
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

    static async #allowAllState<S>(state: S) {
        return true;
    }
}
