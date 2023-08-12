// Contains commands usable from the terminal.

import { broadcast, clipIt, weeklyBotPrint } from "./util.js";
import { Command, CommandSet } from "./commands.js";
import { ChatUser } from "@twurple/chat";
import { PoopCam } from "./poopcam.js";

export const termcommands = new CommandSet(
    "Terminal Command",
    "!",
    undefined,
    new Command(help, "Displays this help message."),
    new Command(clear, "Clears the screen."),
    new Command(exit, "Exits the program.[Provide extra text to add a custom good-bye message]"),
    new Command(clip, "Takes a clip of the current streams."),
    new Command(stats, "Gets the current poopcam stats.")
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
}

function clear(args: string[], state: undefined) {
    console.clear();
    weeklyBotPrint("");
}

async function stats(args: string[], state: undefined) {
    var msg = `Total Requests: ${await PoopCam.getTotalRequests()}\nRankings:`;
    for (let rank = 0; rank < await PoopCam.getTotalParticipants(); rank++) {
        const cammer = await PoopCam.getCammerByRank(rank);
        if (cammer !== undefined) {
            msg = msg.concat(
                `\n[${rank + 1}]: ${cammer.userName} - ${cammer.requestCount} request(s)`
            );
        }
    }

    weeklyBotPrint(msg);
}
