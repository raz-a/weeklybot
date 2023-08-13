import { Config, JsonDB } from "node-json-db";

function randomInt(min: number, max: number) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export type Baby = { //pregnancy stats, deleted upon birth
    mother: string; 
    father: string;
    conceptionDate: Date;
};

export type Child = { //child stats, generated upon birth
    name: string;
    mother: string; 
    father: string;
    birthDate: Date; //for use in birthday command

    //apgar stats are for baby-fighting 
    appearance: number; //health
    pulse: number; //health recovery
    grimace: number; //energy
    activity: number; //attack damage
    respiration: number; //energy recovery
};

export abstract class Pregnancy {
    static #db = new JsonDB(new Config('./save/dayCare.json', true, true));
    static readonly #baby_key = "/babies";
    static readonly #child_key = "/children";
    
    //BABY FUNCTIONALITY
    static async impregnate(mother: string, father: string): Promise<void> { 
        let date: Date = new Date();
        let baby = <Baby>{mother: mother, father:father, conceptionDate:date};
        await this.#db.push(this.#baby_key, baby);
    }

    static async birth(userName: string, babyName: string): Promise<void> {
        const baby = await this.checkPregnancy(userName);
        if (baby != undefined) {
            let date: Date = new Date();
            if (date.getTime() > baby.conceptionDate.getTime() + 1814400000) { //3 weeks in miliseconds
                let appearance = 0, pulse = 0, grimace = 0, activity = 0, respiration = 0;
                if (baby.mother === baby.father) {
                    let appearance = randomInt(1, 5), pulse = randomInt(1, 5), grimace = randomInt(1, 5), activity = randomInt(1, 5), respiration = randomInt(1, 5);
                } else {
                    let appearance = randomInt(1, 10), pulse = randomInt(1, 10), grimace = randomInt(1, 10), activity = randomInt(1, 10), respiration = randomInt(1, 10);
                }
                let child = <Child>{name:babyName, mother:baby.mother, father:baby.father, birthDate:date, appearance:appearance, pulse:pulse, grimace:grimace, activity:activity, respiration:respiration};
                await this.#db.push(this.#child_key, child);
                this.abortion(userName);
            }
        }
    }

    static async abortion(userName: string): Promise<void> {
        try {
            const baby = await this.checkPregnancy(userName);
            if (baby) {
                await this.#db.delete(this.#baby_key + `[/${baby.mother}]`);
            }
        } catch (err) {}
    }

    static async checkPregnancy(userName: string): Promise<Readonly<Baby> | undefined> {
        try {
            return await this.#db.find<Baby>(this.#baby_key, function(entry, idx) {
                let c = <Baby>entry;
                if (c.mother === userName) {
                    return true;
                }

                return false;
            });
        } catch(err) {
            return undefined;
        }
    }


    //CHILD FUNCTIONALITY
    static async listChildren(userName: string): Promise<string> {
        try {
            const children = await this.#db.getData(this.#child_key);
            const childNames: string[] = [];
            
            for (const child of children) {
                if (child.mother === userName || child.father === userName) {
                    childNames.push(child.name);
                }
            }
            
            return childNames.join(', ');
        } catch (err) {
            return "";
        }
    }

    static async getChild(childName: string): Promise<Child | undefined> {
        try {
            const children = await this.#db.getData(this.#child_key);
            return children.find((child: Child) => child.name === childName);
        } catch (err) {
            return undefined;
        }
    }
}