// Contains commands usable from the terminal.

import { broadcast, clip, weeklyBotPrint } from "./util.js";
import { PoopCamStats } from "./usercommands.js";

const termcommands = {
    prefix: '!',
    commands: {
        help: {
            cmd: help,
            desc: "Displays this help message."
        },
        clear: {
            cmd: clearScreen,
            desc: "Clears the screen."
        },
        exit: {
            cmd: exit,
            desc: "Exits the program."
        },
        clip: {
            cmd: clipThat,
            desc: "Takes a clip of the current streams."
        },
        stats: {
            cmd: getStats,
            desc: "Gets the current poopcam stats."
        }
    }
};

type commandIdx = keyof typeof termcommands.commands;

export function processTermCommand(command: string) {
    if (!command.startsWith(termcommands.prefix)) {
        return false;
    }

    command = command.slice(termcommands.prefix.length).toLowerCase();
    let components = command.split(" ");

    command = components[0];
    let args = components.slice(1);

    if (command in termcommands.commands) {
        termcommands.commands[command as commandIdx].cmd(args);

    } else {
        weeklyBotPrint(`Invalid Command "${command}"`);
    }

    return true;
}

function help(args: string[]) {
    weeklyBotPrint("Available commands: ");
    for (const command in termcommands.commands) {
        weeklyBotPrint(`\t${termcommands.prefix}${command} - ${termcommands.commands[command as commandIdx].desc}`);
    }
}

function exit(args: string[]) {
    var msg: string;
    if (args.length > 0) {
        msg = args.join(" ");
    } else {
        msg = "Thanks for watching! Weeklybot out!";
    }

    broadcast(null, msg).then((v) => process.exit());
}

function clipThat(args: string[]) {
    clip(false);
}

function clearScreen(args: string[]) {
    console.clear();
    weeklyBotPrint("");
}

function getStats(args: string[]) {
    var msg = `Total Requests: ${PoopCamStats.totalrequests}\nRankings:`;
    var rank = 1;
    for (let cammer of PoopCamStats.cammers) {
        msg = msg.concat(`\n[${rank++}]: ${cammer.user} - ${cammer.requests} request(s)`);
    }

    weeklyBotPrint(msg);
}
