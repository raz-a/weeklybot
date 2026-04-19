import { weeklyBotPrint } from "./util.js";
import { Config, JsonDB } from "node-json-db";

let userDefinitionsEnabled = true;

export function getUserDefinitionsEnabled(): boolean {
    return userDefinitionsEnabled;
}

export function setUserDefinitionsEnabled(enabled: boolean): void {
    userDefinitionsEnabled = enabled;
}

export abstract class MemeDictionary {
    static #db = new JsonDB(new Config("./save/memedictionary.json", true, true));
    static readonly #rootkey = "/definitions";

    static async getDefinitions(word: string): Promise<string[]> {
        try {
            const defs = await this.#db.getData(`${this.#rootkey}/${word.toLowerCase()}`);
            return Array.isArray(defs) ? defs : [];
        } catch {
            return [];
        }
    }

    static async addDefinition(word: string, definition: string): Promise<void> {
        const key = word.toLowerCase();
        const existing = await this.getDefinitions(key);
        existing.push(definition);
        await this.#db.push(`${this.#rootkey}/${key}`, existing);
    }

    static async removeDefinition(word: string, index?: number): Promise<boolean> {
        const key = word.toLowerCase();
        try {
            if (index === undefined) {
                await this.#db.delete(`${this.#rootkey}/${key}`);
                return true;
            }

            const existing = await this.getDefinitions(key);
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

async function define_word_api(word: string): Promise<string[]> {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!response.ok) {
        return [];
    }

    const result = await response.json();

    if (!Array.isArray(result)) {
        return [];
    }

    let definitions: string[] = [];

    result.forEach((entry) => {
        entry.meanings.forEach((meaning: any) => {
            meaning.definitions.forEach((definition: any) => {
                definitions.push(JSON.stringify(definition.definition));
            });
        });
    });

    return definitions;
}

export async function define_word(word: string): Promise<string[]> {
    const [memeDefinitions, apiDefinitions] = await Promise.all([
        MemeDictionary.getDefinitions(word),
        define_word_api(word),
    ]);

    return [...memeDefinitions, ...apiDefinitions];
}
