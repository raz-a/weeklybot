// Contains commands usable from the terminal.

import { broadcast, weeklyBotPrint } from "./util.js";

const termcommands = {
    prefix: '!',
    commands: {
        help: {
            cmd: help,
            desc: "Displays this help message."
        },
        exit: {
            cmd: exit,
            desc: "Exits the program."
        }
    }
};

export function processTermCommand(command) {
    if (!command.startsWith(termcommands.prefix)) {
        return false;
    }

    command = command.slice(termcommands.prefix.length).toLowerCase();
    let components = command.split(" ");

    command = components[0];
    let args = components.slice(1);

    if (command in termcommands.commands) {
        termcommands.commands[command].cmd(args);

    } else {
        weeklyBotPrint(`Invalid Command "${command}"`);
    }

    return true;
}

function help(args) {
    weeklyBotPrint("Available commands: ");
    for (const command in termcommands.commands) {
        weeklyBotPrint(`\t${termcommands.prefix}${command} - ${termcommands.commands[command].desc}`);
    }
}

function exit(args) {
    process.exit();
}
