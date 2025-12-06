// Contains commands usable from the terminal.

import { broadcast, clipIt, getRelayMode, setRelayMode, weeklyBotPrint } from "./util.js";
import { Command, CommandSet } from "./commands.js";
import { PoopCam } from "./poopcam.js";
import { UI, UseUI } from "./ui.js";
import {
    addBroadcaster,
    getBroadcasterChannels,
    isBroadcasterAdded,
    removeBroadcaster,
} from "./broadcaster.js";
import { FeatureRequestDB } from "./feature_requests.js";

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
    new Command(remove, "Removes a channel from the WeeklyBot chat."),
    new Command(list, "Gets the list of broadcasters currently connected."),
    new Command(
        relay,
        "[on|off] Enables or disables message relaying to all connected broadcasters."
    ),
    new Command(requests, "Gets the list of requested features.")
);

async function requests(args: string[], state: undefined) {
    if (args.length == 2 && args[0].toLocaleLowerCase() === "delete" && !isNaN(+args[1])) {
        await FeatureRequestDB.RemoveRequestByIndex(+args[1]);
        weeklyBotPrint(`Deleted feature request #${+args[1]}`);
        return;
    }

    let requests = await FeatureRequestDB.GetRequests();

    if (requests.length == 0) {
        weeklyBotPrint("No requests.");
        return;
    }

    weeklyBotPrint("Requested Features:");
    requests.forEach((request, index) => {
        weeklyBotPrint(`[${index}]: ${JSON.stringify(request)}`);
    });
}

function relay(args: string[], state: undefined) {
    if (args.length < 1) {
        weeklyBotPrint(`Relay mode is currently ${getRelayMode() ? "ON" : "OFF"}`);
        return;
    }

    const option = args[0].toLowerCase();

    if (option === "on") {
        setRelayMode(true);
        weeklyBotPrint("Relay mode enabled.");
    } else if (option === "off") {
        setRelayMode(false);
        weeklyBotPrint("Relay mode disabled.");
    } else {
        weeklyBotPrint("Invalid option. Use 'on' or 'off'.");
    }
}

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

    await broadcast(msg);
    process.exit(0);
}

function clip(args: string[], state: undefined) {
    clipIt(false);
    weeklyBotPrint("Took a clip.");
}

function clear(args: string[], state: undefined) {
    if (UseUI) {
        UI.clear();
    } else {
        console.clear();
        weeklyBotPrint("");
    }
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
    broadcast(`Poopcam (TM) Rate limit is now ${seconds} seconds`);
}

async function add(args: string[], state: undefined) {
    let channel = args[0];

    var msg;
    if (isBroadcasterAdded(channel)) {
        msg = `${channel} is already in WeeklyBot chat.`;
    } else if (await addBroadcaster(channel)) {
        msg = `Added ${channel} to WeeklyBot chat!`;
        broadcast(msg);
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

function list(args: string[], state: undefined) {
    weeklyBotPrint("Currently connected broadcasters:");
    for (const channel of getBroadcasterChannels()) {
        weeklyBotPrint(channel);
    }
}
