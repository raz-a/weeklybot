import blessed from "blessed";

export abstract class UI {
    static #screen = blessed.screen({ smartCSR: true, dockBorders: true });
    static #messages = blessed.log({
        border: "line",
        height: "100%",
        width: "100%",
        scrollbar: {},
        scrollable: true,
    });
    static #prompt = blessed.textbox({
        border: "line",
        top: "93%",
        width: "100%",
        content: "test",
        label: "WeeklyBot",
        inputOnFocus: true,
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
