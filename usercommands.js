// Contains commands usable by users in the stream.

import { weeklyBotPrint, send, broadcast, clip, timeout } from "./util.js";
import * as fs from 'fs'

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
        clip: {
            cmd: clipThat,
            desc: "Take a clip on all the live streams!"
        },
        plates: {
            cmd: plates,
            desc: "PLATES"
        },
        request: {
            cmd: requestFeature,
            desc: "Request a feature for WeeklyBot."
        },
        love: {
            cmd: loveMe,
            desc: "Find out if WeeklyBot loves you!"
        }
    }
};

export function processUserCommand(channel, user, msg) {

    let prefix = usercommands.prefix;

    if (!msg.startsWith(prefix)) {
        return false;
    }

    let words = msg.split(" ");
    let command = words[0].slice(prefix.length).toLowerCase();
    let args = words.slice(1);

    if (command in usercommands.commands) {
        usercommands.commands[command].cmd(channel, user, args);

    } else {
        weeklyBotPrintUserCommandLog(`Invalid Command "${command}" from ${user["display-name"]}`);
    }

    return true;
}

function weeklyBotPrintUserCommandLog(msg) {
    weeklyBotPrint(`[${usercommands.header}]: ${msg}`);
}

function help(channel, user, args) {
    let prefix = usercommands.prefix;
    weeklyBotPrintUserCommandLog(`Listing commands for ${user["display-name"]}.`);

    if (args.length == 1) {
        let command = args[0];
        if (command in usercommands.commands) {
            send(channel, `${prefix}${command}: ${usercommands.commands[command].desc}`, "chat");
            return;
        }
    }

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
        msg += ` ${prefix}${command} `;
    }

    return msg;
}

function bingo(channel, user, args) {
    weeklyBotPrintUserCommandLog(`Printing Bingo Board for ${user["display-name"]}`);
    broadcast(null, `Mario Kart 64 Hard Mode Bingo Board: https://i.imgur.com/Tt7iU4I.png`, "chat");
}

function selectALevel(channel, user, args) {

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

export var PoopCamStats = {};
function poopCam(channel, user, args) {
    weeklyBotPrintUserCommandLog(`Telling ${user["display-name"]} about PoopCam (TM)`);

    if (typeof PoopCamStats.count == 'undefined') {
        PoopCamStats.count = 0;
    }

    if (++PoopCamStats.count == 1) {
        broadcast(null, `PoopCam (TM) has been requested 1 time this stream. Keep it up!`, "chat");
    } else {
        broadcast(null, `PoopCam (TM) has been requested ${PoopCamStats.count} times this stream. Keep it up!`, "chat");
    }

    if (typeof PoopCamStats.dict == 'undefined') {
        PoopCamStats.dict = {};
        PoopCamStats.max = 0;
    }

    if ((user["display-name"] in PoopCamStats.dict) == false) {
        PoopCamStats.dict[user["display-name"]] = 0;
    }

    if (++PoopCamStats.dict[user["display-name"]] > PoopCamStats.max) {
        PoopCamStats.max = PoopCamStats.dict[user["display-name"]];
        broadcast(null, `${user["display-name"]} is now the #1 poopcammer with ${PoopCamStats.max} requests!`, "chat");
    }
}

function isItWednesday(channel, user, args) {
    weeklyBotPrintUserCommandLog(`Telling ${user["display-name"]} if it is Wednesday.`);

    let d = new Date();
    if (d.getDay() === 3) {
        broadcast(null, "IT IS WEDNESDAY!!!! WOOHOO!!!!", "chat");
    } else {
        broadcast(null, "It's not Wednesday yet :(", "chat");
    }
}

function clipThat(channel, user, args) {
    weeklyBotPrintUserCommandLog(`${user["display-name"]} is taking a clip`);
    let channel_str = channel.substring(1).toLowerCase();
    let user_str = user["display-name"].toLowerCase();
    let delay = channel_str.localeCompare(user_str) !== 0;
    clip(delay);
}

function plates(channel, user, args) {
    weeklyBotPrintUserCommandLog(`${user["display-name"]} is commenting on plates`);
    broadcast(null, "Plates are an archaic invention. A bowl can do the exact same thing, but with protective walls. Did you buy the ice cream I asked for? My 20% down payment for it is on the counter. I spent the rest of my money on this small ax.", "chat");
}

function requestFeature(channel, user, args) {
    let request = args.join(" ");
    weeklyBotPrintUserCommandLog(`${user["display-name"]} is requesting a feature: ${request}`);

    fs.appendFileSync("./requests.txt", `[${new Date().toLocaleString()}] ${user["display-name"]} - ${request} \n`);
    broadcast(null, "Feature requested!", "chat");
}

export var LoveStats = {};
function loveMe(channel, user, args) {
    if ((user["display-name"] in LoveStats) == false) {
        LoveStats[user["display-name"]] = 0;
    }

    switch (++LoveStats[user["display-name"]]) {
        default:
            broadcast(null, `I love you ${user["display-name"]}!`, "chat");
            break;

        case 5:
            broadcast(null, `I love you ${user["display-name"]}.`, "chat");
            break

        case 6:
            broadcast(null, `I love you ${user["display-name"]}...`, "chat");
            break;

        case 7:
            broadcast(null, `I love you ${user["display-name"]}, but this is getting a bit much...`, "chat");
            break;

        case 8:
            broadcast(null, `${user["display-name"]} you gotta learn to love yourself.`, "chat");
            break;

        case 9:
            broadcast(null, `Yo ${user["display-name"]}, you gotta stop with this. I'm warning you.`, "chat");
            break;

        case 10:
            broadcast(null, `${user["display-name"]} you messed up by asking for too much love.`, "chat");
            timeout(null, user.username, 10, "You are too desperate for love.");
            LoveStats[user["display-name"]] = 0;
            break;
    }
}