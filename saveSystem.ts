import * as fs from 'fs';
import * as path from 'path';

interface JSONObject {
  [key: string]: any;
}

class LibraryDB {
    private filePathString = '/saves';

    constructor() {}

    // pass: filename (works as a key: poopcam || pregnancy || etc...)
    // returns: full JSON of specified file
    private getFileFromJSON(fileName: string): JSONObject {
        const filePath = path.join(this.filePathString, `${fileName}.json`);
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(fileContent);
        } else {
            return {};
        }
    }

    // pass: JSON entry 
    //       filename (works as a key: poopcam || pregnancy || etc...),
    //       Key is usually the user issuing the command
    // returns: nothing, updates entires correlating to the key with new values
    public saveRecordToJSON(obj: JSONObject, filename: string, key: string): void {
        const dbObject = this.getFileFromJSON(filename);
        dbObject[key] = obj;

        try {
            const file = path.join(this.filePathString, `${filename}.json`);
            fs.writeFileSync(file, JSON.stringify(dbObject));
        } catch (e) {
            console.error(e);
        }
    }

    // pass: searchKey (search term to scan JSON for),
    //       filename (works as a key: poopcam || pregnancy || etc...),
    // returns: the JSON object containing the key from the file
    public getRecordFromJSON(searchKey: string, filename: string): JSONObject | null {
        try {
            const jsonObject = this.getFileFromJSON(filename);

            for (const key of Object.keys(jsonObject)) {
                if (key === searchKey) {
                    return jsonObject[key];
                }
            }
        } catch (e) {
            console.error(e);
        }
        return null;
    }
}

export default LibraryDB;