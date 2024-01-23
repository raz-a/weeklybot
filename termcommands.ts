// Contains commands usable from the terminal.

import { broadcast, clipIt, weeklyBotPrint } from "./util.js";
import { Command, CommandSet } from "./commands.js";
import { PoopCam } from "./poopcam.js";
import { UI } from "./ui.js";
import { addBroadcaster, isBroadcasterAdded, removeBroadcaster } from "./broadcaster.js";

export const termcommands = new CommandSet(
    "Terminal Command",
    "!",
    undefined,
    new Command(help, "Displays this help message."),
    new Command(clear, "Clears the screen."),
    new Command(exit, "Exits the program.[Provide extra text to add a custom good-bye message]"),
    new Command(clip, "Takes a clip of the current streams."),
    new Command(stats, "Gets the current poopcam stats."),
    new Command(rate, "Sets the poopcam rate limit in seconds"),
    new Command(add, "Adds a channel to the WeeklyBot chat."),
    new Command(remove, "Removes a channel from the WeeklyBot chat.")
);

function help(args: string[], state: undefined) {
    weeklyBotPrint("Available commands: ");
    for (const command of termcommands.getCommands()) {
        weeklyBotPrint(
            `\t${termcommands.prefix}${command} - ${termcommands.getDescription(command)}`
        );
    }
}

async function exit(args: string[], state: undefined) {
    var msg: string;
    if (args.length > 0) {
        msg = args.join(" ");
    } else {
        msg = "Thanks for watching! Weeklybot out!";
    }

    await broadcast(null, msg);
    process.exit(0);
}

function clip(args: string[], state: undefined) {
    clipIt(false);
    weeklyBotPrint("Took a clip.");
}

function clear(args: string[], state: undefined) {
    UI.clear();
}

async function stats(args: string[], state: undefined) {
    var msg = `Total Requests: ${await PoopCam.getTotalRequests()}\nRankings:`;
    for (let rank = 0; rank < (await PoopCam.getTotalParticipants()); rank++) {
        const cammer = await PoopCam.getCammerByRank(rank);
        if (cammer !== undefined) {
            msg = msg.concat(
                `\n[${rank + 1}]: ${cammer.userName} - ${cammer.requestCount} request(s)`
            );
        }
    }

    weeklyBotPrint(msg);
}

function rate(args: string[], state: undefined) {
    let seconds = Number(args[0]);
    if (isNaN(seconds) || !PoopCam.setRateLimit(seconds)) {
        weeklyBotPrint("Invalid limit provided");
    }

    weeklyBotPrint(`Set rate limit to ${seconds} seconds`);
    broadcast(null, `Poopcam (TM) Rate limit is now ${seconds} seconds`);
}

async function add(args: string[], state: undefined) {
    let channel = args[0];

    var msg;
    if (isBroadcasterAdded(channel)) {
        msg = `${channel} is already in WeeklyBot chat.`;
    } else if (await addBroadcaster(channel)) {
        msg = `Added ${channel} to WeeklyBot chat!`;
        broadcast(null, msg);
    } else {
        msg = `Could not add ${channel} to WeeklyBot chat.`;
    }

    weeklyBotPrint(msg);
}

function remove(args: string[], state: undefined) {
    let channel = args[0];

    if (removeBroadcaster(channel)) {
        weeklyBotPrint(`Removed ${channel} from the WeeklyBot chat`);
    } else {
        weeklyBotPrint(`Could not remove ${channel} from the WeeklyBot chat`);
    }
}
