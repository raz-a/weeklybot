// Contains commands usable by mods in the stream.

import { ChatUser } from "@twurple/chat";
import { apiClient } from "./client.js";
import { Command, CommandSet } from "./commands.js";
import { broadcast, getBroadcasterList, me, send, weeklyBotPrint } from "./util.js";

export const modcommands = new CommandSet(
    "Mod Command",
    "!",
    isMod,
    new Command(ban, "Bans a user on all streams"),
    new Command(unban, "Unbans a user on all streams")
);

async function isMod(mod: ChatUser) {
    return mod.isBroadcaster || mod.isMod;
}

async function ban(args: string[], mod: ChatUser) {
    const userToBeBanned = args[0];
    if (userToBeBanned) {
        modcommands.log(`${mod.displayName} is attempting to ban ${userToBeBanned}.`);
        try {
            const user = await apiClient.users.getUserByName(userToBeBanned);
            if (user !== null) {
                for (const broadcaster of getBroadcasterList()) {
                    if (user.id === broadcaster.id) {
                        broadcast(null, "Broadcasters cannot be banned.");
                        return;
                    }
                }

                for (const broadcaster of getBroadcasterList()) {
                    const result = await apiClient.moderation.banUser(broadcaster, me, {
                        reason: `${mod.displayName} has banned you via WeeklyBot.`,
                        userId: user,
                    });

                    if (result) {
                        send(
                            broadcaster.name,
                            `${userToBeBanned} has been banned by ${mod.displayName}.`
                        );
                    } else {
                        send(broadcaster.name, `Could not ban ${userToBeBanned}.`);
                    }
                }
            } else {
                broadcast(null, `${userToBeBanned} could not be found`);
            }
        } catch (err) {
            weeklyBotPrint(`Error: ${err}`);
            broadcast(null, `Cannot ban ${userToBeBanned}`);
        }
    } else {
        modcommands.log(`${mod.displayName} is attempting to ban nobody?`);
        broadcast(null, `${mod.displayName}, you forgot to mention who you wanted to ban...`);
    }
}

async function unban(args: string[], mod: ChatUser) {
    const userToBeUnbanned = args[0];
    if (userToBeUnbanned) {
        modcommands.log(`${mod.displayName} is attempting to unban ${userToBeUnbanned}.`);
        try {
            const user = await apiClient.users.getUserByName(userToBeUnbanned);
            if (user !== null) {
                for (const broadcaster of getBroadcasterList()) {
                    await apiClient.moderation.unbanUser(broadcaster, me, user);
                    send(
                        broadcaster.name,
                        `${userToBeUnbanned} has been unbanned by ${mod.displayName}.`
                    );
                }
            } else {
                broadcast(null, `${userToBeUnbanned} could not be found`);
            }
        } catch (err) {
            weeklyBotPrint(`Error: ${err}`);
            broadcast(null, `Cannot unban ${userToBeUnbanned}`);
        }
    } else {
        modcommands.log(`${mod.displayName} is attempting to unban nobody?`);
        broadcast(null, `${mod.displayName}, you forgot to mention who you wanted to unban...`);
    }
}
