import blessed from "blessed";

export abstract class UI {
    static #screen = blessed.screen({
        smartCSR: true,
        dockBorders: true,
        terminal: "xterm-256color",
    });
    static #messages = blessed.log({
        border: "line",
        width: "100%",
        height: "100%-3",
    });
    static #prompt = blessed.textbox({
        border: "line",
        top: "100%-3",
        width: "100%",
        inputOnFocus: true,
        label: "WeeklyBot",
    });

    static #promptCallback: ((cmd: string) => void) | undefined = undefined;

    static init() {
        this.#prompt.on("submit", (val) => {
            if (this.#promptCallback !== undefined) {
                this.#promptCallback(val);
            } else {
                this.#messages.pushLine(val);
            }
        });

        this.#prompt.on("action", () => {
            this.#prompt.clearValue();
            this.#screen.render();
            this.#prompt.focus();
        });

        this.#screen.append(this.#messages);
        this.#screen.append(this.#prompt);
        this.#screen.render();
        this.#prompt.focus();
    }

    static print(content: string) {
        this.#messages.pushLine(content);
        this.#screen.render();
    }

    static onPromptAvailable(callback: (cmd: string) => void) {
        this.#promptCallback = callback;
    }

    static clear() {
        this.#messages.setContent("");
        this.#prompt.clearValue();
        this.#screen.render();
    }
}
