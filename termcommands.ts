// Contains commands usable from the terminal.

import { broadcast, clipIt, weeklyBotPrint } from "./util.js";
import { PoopCamStats } from "./usercommands.js";
import { Command, CommandSet } from "./commands.js";
import { ChatUser } from "@twurple/chat";

export const termcommands = new CommandSet(
    "Terminal Command",
    "!",
    new Command(help, "Displays this help message."),
    new Command(clear, "Clears the screen."),
    new Command(exit, "Exits the program.[Provide extra text to add a custom good-bye message]"),
    new Command(clip, "Takes a clip of the current streams."),
    new Command(stats, "Gets the current poopcam stats.")
);

function help(args: string[], channel?: string, user?: ChatUser) {
    weeklyBotPrint("Available commands: ");
    for (const command of termcommands.getCommands()) {
        weeklyBotPrint(
            `\t${termcommands.prefix}${command} - ${termcommands.getDescription(command)}`
        );
    }
}

async function exit(args: string[], channel?: string, user?: ChatUser) {
    var msg: string;
    if (args.length > 0) {
        msg = args.join(" ");
    } else {
        msg = "Thanks for watching! Weeklybot out!";
    }

    await broadcast(null, msg);
    process.exit();
}

function clip(args: string[], channel?: string, user?: ChatUser) {
    clipIt(false);
}

function clear(args: string[], channel?: string, user?: ChatUser) {
    console.clear();
    weeklyBotPrint("");
}

function stats(args: string[], channel?: string, user?: ChatUser) {
    var msg = `Total Requests: ${PoopCamStats.totalrequests}\nRankings:`;
    var rank = 1;
    for (let cammer of PoopCamStats.cammers) {
        msg = msg.concat(`\n[${rank++}]: ${cammer.user} - ${cammer.requests} request(s)`);
    }

    weeklyBotPrint(msg);
}
