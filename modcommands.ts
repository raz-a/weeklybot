// Contains commands usable by mods in the stream.

import { apiClient } from "./client.js";
import { Command, CommandSet } from "./commands.js";
import { broadcast, getBroadcasterList } from "./util.js";

export const modcommands = new CommandSet(
    "Mod Command",
    "!",
    isMod,
    new Command(ban, "Bans a user on all streams")
);

// RAZTODO: Need moderation:read permission.
async function isMod(modName: string) {
    let user = await apiClient.users.getUserByName(modName);
    if (!user) {
        return false;
    }

    // RAZTODO: Uncomment.

    // for (let broadcaster of getBroadcasterList()) {
    //     if (broadcaster === user || (await apiClient.moderation.checkUserMod(broadcaster, user))) {
    //         return true;
    //     }
    // }

    return false;
}

function ban(args: string[], modName: string) {
    const userToBeBanned = args[0];
    if (userToBeBanned) {
        modcommands.log(`${modName} is attempting to ban ${userToBeBanned}.`);
    } else {
        modcommands.log(`${modName} is attempting to ban nobody?`);
        broadcast(null, `${modName}, you forgot to mention who you wanted to ban...`);
    }
}
