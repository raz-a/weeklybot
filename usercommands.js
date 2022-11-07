// Contains commands usable by users in the stream.

import { weeklyBotPrint, send, broadcast, clip } from "./util.js";

// Define available commands.
const usercommands = {
    prefix: '!',
    header: "User Command",
    commands: {
        help: {
            cmd: help,
            desc: "Displays this help message."
        },
        bingo: {
            cmd: bingo,
            desc: "Gets the link to the current Mario Kart 64 Hard-Mode Bingo Sheet."
        },
        selectalevel: {
            cmd: selectALevel,
            desc: "Get WeeklyBot involved in the \"Select A Level\" shenanigans."
        },
        poopcam: {
            cmd: poopCam,
            desc: "Keep up to date with the latest PoopCam (TM) news!"
        },
        isitwednesday: {
            cmd: isItWednesday,
            desc: "Have WeeklyBot tell you if it is Wednesday!"
        },
        ads: {
            cmd: ads,
            desc: "Provides set of resources for blocking ads on Twitch."
        },
        clip: {
            cmd: clipThat,
            desc: "Take a clip on all the live streams!"
        }
    }
};

export function processUserCommand(channel, user, command) {

    let prefix = usercommands.prefix;

    if (!command.startsWith(prefix)) {
        return false;
    }

    command = command.slice(prefix.length).toLowerCase();

    if (command in usercommands.commands) {
        usercommands.commands[command].cmd(channel, user);

    } else {
        weeklyBotPrintUserCommandLog(`Invalid Command "${command}" from ${user["display-name"]}`);
    }

    return true;
}

function weeklyBotPrintUserCommandLog(msg) {
    weeklyBotPrint(`[${usercommands.header}]: ${msg}`);
}

function help(channel, user) {
    weeklyBotPrintUserCommandLog(`Listing commands for ${user["display-name"]}.`);

    let msg =
        `Hi there, ${user["display-name"]}!
         I'm WeeklyBot. The Official Weekly Wednesday chat combining bot.
         You can use the following commands to interact with me:`;

    msg += getCommandsString();

    send(channel, msg, "chat");
}

function getCommandsString() {
    let prefix = usercommands.prefix;

    let msg = "";
    for (const command in usercommands.commands) {
        msg += ` ${prefix}${command} - ${usercommands.commands[command].desc} `;
    }

    return msg;
}

function bingo(channel, user) {
    weeklyBotPrintUserCommandLog(`Printing Bingo Board for ${user["display-name"]}`);
    broadcast(null, `Mario Kart 64 Hard Mode Bingo Board: https://i.imgur.com/Tt7iU4I.png`, "chat");
}

function selectALevel(channel, user) {

    weeklyBotPrintUserCommandLog(`Select A Level for ${user["display-name"]}`);

    const messages = [
        "sElEcT a LeVeL",
        "SeLeCt A lEvEl",
        "S E L E C T A L E V E L",
        "selectalebel",
    ];

    let msg = messages[Math.floor(Math.random() * messages.length)];
    broadcast(null, msg, "chat");
}

function poopCam(channel, user) {
    weeklyBotPrintUserCommandLog(`Telling ${user["display-name"]} about PoopCam (TM)`);

    if (typeof poopCam.count == 'undefined') {
        poopCam.count = 0;
    }

    if (++poopCam.count == 1) {
        broadcast(null, `PoopCam (TM) has been requested 1 time this stream. Keep it up!`, "chat");
    } else {
        broadcast(null, `PoopCam (TM) has been requested ${poopCam.count} times this stream. Keep it up!`, "chat");
    }
}

function isItWednesday(channel, user) {
    weeklyBotPrintUserCommandLog(`Telling ${user["display-name"]} if it is Wednesday.`);

    let d = new Date();
    if (d.getDay === 3) {
        broadcast(null, "IT IS WEDNESDAY!!!! WOOHOO!!!!", "chat");
    } else {
        broadcast(null, "It's not Wednesday yet :(", "chat");
    }
}

function ads(channel, user) {

    const msg = `Ads suck. Block twitch ads with: https://chrome.google.com/webstore/detail/twitch-adblock-plus/mdohdkncgoaamplcaokhmlppgafhlima`;

    weeklyBotPrintUserCommandLog(`${user["display-name"]} hates ads.`);

    broadcast(null, msg, "chat");
}

function clipThat(channel, user) {
    weeklyBotPrintUserCommandLog(`${user["display-name"]} is taking a clip`);
    let channel_str = channel.substring(1).toLowerCase();
    let user_str = user["display-name"].toLowerCase();
    let delay = channel_str.localeCompare(user_str) !== 0;
    clip(delay);
}
