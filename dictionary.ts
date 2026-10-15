import { weeklyBotPrint } from "./util.js";
import { Config, JsonDB } from "node-json-db";

let userDefinitionsEnabled = true;

export function getUserDefinitionsEnabled(): boolean {
    return userDefinitionsEnabled;
}

export function setUserDefinitionsEnabled(enabled: boolean): void {
    userDefinitionsEnabled = enabled;
}

// A stored meme definition. `author` is the chat user who added it, or null for
// legacy entries (added before authorship was tracked) and dashboard/terminal adds.
export type MemeDefinition = {
    text: string;
    author: string | null;
};

// A definition resolved for chat display: either a meme definition (possibly authored)
// or an external dictionary-API result (never authored).
export type ResolvedDefinition = {
    text: string;
    author: string | null;
};

export abstract class MemeDictionary {
    static #db = new JsonDB(new Config("./save/memedictionary.json", true, true));
    static readonly #rootkey = "/definitions";

    // Coerces a stored entry into a MemeDefinition. Entries were originally plain
    // strings; authored objects are the current format. Normalizing on read lets old
    // save files keep working (they migrate to the object form on the next write).
    static #asDefinition(entry: unknown): MemeDefinition | null {
        if (typeof entry === "string") {
            return { text: entry, author: null };
        }
        if (entry && typeof entry === "object" && typeof (entry as MemeDefinition).text === "string") {
            const author = (entry as MemeDefinition).author;
            return {
                text: (entry as MemeDefinition).text,
                author: typeof author === "string" ? author : null,
            };
        }
        return null;
    }

    // Words become node-json-db path segments, where "/", "[", "]" and empty
    // strings have structural meaning. Restrict keys to a safe set so a crafted
    // word can't escape its node or wipe the dictionary root.
    static #normalize(word: string): string | null {
        const key = word.trim().toLowerCase();
        return /^[a-z0-9]{1,50}$/.test(key) ? key : null;
    }

    // Authored definitions for a word (legacy string entries surface with author null).
    static async getDefinitionEntries(word: string): Promise<MemeDefinition[]> {
        const key = this.#normalize(word);
        if (!key) return [];
        try {
            const raw = await this.#db.getData(`${this.#rootkey}/${key}`);
            if (!Array.isArray(raw)) return [];
            return raw
                .map((entry) => this.#asDefinition(entry))
                .filter((def): def is MemeDefinition => def !== null);
        } catch {
            return [];
        }
    }

    // Definition text only. Kept for callers (dashboard, terminal, API merge) that
    // don't care who authored a definition.
    static async getDefinitions(word: string): Promise<string[]> {
        return (await this.getDefinitionEntries(word)).map((def) => def.text);
    }

    static async addDefinition(
        word: string,
        definition: string,
        author: string | null = null
    ): Promise<boolean> {
        const key = this.#normalize(word);
        if (!key) return false;
        const existing = await this.getDefinitionEntries(key);
        existing.push({ text: definition, author });
        await this.#db.push(`${this.#rootkey}/${key}`, existing);
        return true;
    }

    static async removeDefinition(word: string, index?: number): Promise<boolean> {
        const key = this.#normalize(word);
        if (!key) return false;
        try {
            if (index === undefined) {
                await this.#db.delete(`${this.#rootkey}/${key}`);
                return true;
            }

            const existing = await this.getDefinitionEntries(key);
            if (index < 0 || index >= existing.length) {
                return false;
            }

            existing.splice(index, 1);

            if (existing.length === 0) {
                await this.#db.delete(`${this.#rootkey}/${key}`);
            } else {
                await this.#db.push(`${this.#rootkey}/${key}`, existing);
            }

            return true;
        } catch {
            return false;
        }
    }

    static async getAllWords(): Promise<string[]> {
        try {
            const data = await this.#db.getData(this.#rootkey);
            return Object.keys(data);
        } catch {
            return [];
        }
    }
}

function collectDefinitions(senses: unknown, definitions: string[]): void {
    if (!Array.isArray(senses)) {
        throw new Error("Invalid dictionary API senses");
    }
    for (const sense of senses as unknown[]) {
        if (!sense || typeof sense !== "object" ||
            !("definition" in sense) || typeof sense.definition !== "string" ||
            !("subsenses" in sense)) {
            throw new Error("Invalid dictionary API sense");
        }
        definitions.push(JSON.stringify(sense.definition));
        collectDefinitions(sense.subsenses, definitions);
    }
}

async function define_word_api(word: string): Promise<string[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    try {
        const response = await fetch(
            `https://freedictionaryapi.com/api/v1/entries/en/${encodeURIComponent(word)}`,
            { signal: controller.signal }
        );
        if (!response.ok) {
            throw new Error(`Dictionary API returned HTTP ${response.status}`);
        }
        const result: unknown = await response.json();
        if (!result || typeof result !== "object" ||
            !("entries" in result) || !Array.isArray(result.entries)) {
            throw new Error("Invalid dictionary API entries");
        }
        const definitions: string[] = [];
        for (const entry of result.entries as unknown[]) {
            if (!entry || typeof entry !== "object" || !("senses" in entry)) {
                throw new Error("Invalid dictionary API entry");
            }
            collectDefinitions(entry.senses, definitions);
        }
        return definitions;
    } finally {
        clearTimeout(timeout);
    }
}

export async function define_word(word: string): Promise<ResolvedDefinition[]> {
    const [memeResult, apiResult] = await Promise.allSettled([
        MemeDictionary.getDefinitionEntries(word),
        define_word_api(word),
    ]);
    if (memeResult.status === "rejected") {
        throw memeResult.reason;
    }
    const memeDefinitions = memeResult.value;
    if (apiResult.status === "rejected") {
        weeklyBotPrint(`Dictionary API lookup failed for "${word}": ${apiResult.reason}`);
        if (memeDefinitions.length === 0) {
            throw apiResult.reason;
        }
        return memeDefinitions;
    }

    return [
        ...memeDefinitions,
        ...apiResult.value.map((text): ResolvedDefinition => ({ text, author: null })),
    ];
}
