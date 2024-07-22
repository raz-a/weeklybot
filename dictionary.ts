import { weeklyBotPrint } from "./util.js";

export async function define_word(word: string): Promise<string[]> {
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
