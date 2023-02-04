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
            desc: "Gets the link to the current Super Mario 64 Co-Op Speedrun Bingo Sheet."
        },
        selectalevel: {
            cmd: selectALevel,
            desc: "Get WeeklyBot involved in the \"Select A Level\" shenanigans."
        },
        poopcam: {
            cmd: poopCam,
            desc: "Keep up to date with the latest PoopCam (TM) news!"
        },
        stats: {
            cmd: getPoopCamStats,
            desc: "Get the latest PoopCam (TM) stats!"
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

type commandIdx = keyof typeof usercommands.commands;

export function processUserCommand(channel: string, user: string, msg: string ) {

    let prefix = usercommands.prefix;

    if (!msg.startsWith(prefix)) {
        return false;
    }

    let words = msg.split(" ");
    let command = words[0].slice(prefix.length).toLowerCase();
    let args = words.slice(1);

    if (command in usercommands.commands) {
        usercommands.commands[command as commandIdx].cmd(channel, user, args);

    } else {
        weeklyBotPrintUserCommandLog(`Invalid Command "${command}" from ${user}`);
    }

    return true;
}

function weeklyBotPrintUserCommandLog(msg: string) {
    weeklyBotPrint(`[${usercommands.header}]: ${msg}`);
}

function help(channel: string, user: string, args: string[]) {
    let prefix = usercommands.prefix;
    weeklyBotPrintUserCommandLog(`Listing commands for ${user}.`);

    if (args.length == 1) {
        let command = args[0];
        if (command in usercommands.commands) {
            send(channel, `${prefix}${command}: ${usercommands.commands[command as commandIdx].desc}`);
            return;
        }
    }

    let msg =
        `Hi there, ${user}!
         I'm WeeklyBot. The Official Weekly Wednesday chat combining bot.
         You can use the following commands to interact with me:`;

    msg += getCommandsString();

    send(channel, msg);
}

function getCommandsString() {
    let prefix = usercommands.prefix;

    let msg = "";
    for (const command in usercommands.commands) {
        msg += ` ${prefix}${command} `;
    }

    return msg;
}

function bingo(channel: string, user: string, args: string[]) {
    weeklyBotPrintUserCommandLog(`Printing Bingo Board for ${user}`);
    broadcast(null, `Super Mario 64 Co-Op 120 star Bingo Board: https://mfbc.us/m/ed53p9x`);
}

function selectALevel(channel: string, user: string, args: string[]) {

    weeklyBotPrintUserCommandLog(`Select A Level for ${user}`);

    const messages = [
        "sElEcT a LeVeL",
        "SeLeCt A lEvEl",
        "S E L E C T A L E V E L",
        "selectalebel",
    ];

    let msg = messages[Math.floor(Math.random() * messages.length)];
    broadcast(null, msg);
}

export type PoopCammer = {
    user: string,
    requests: number
};

export var PoopCamStats = {
    cammers: [] as PoopCammer[],
    totalrequests: 0
};

function poopCam(channel: string, user: string, args: string[]) {
    weeklyBotPrintUserCommandLog(`Telling ${user} about PoopCam (TM)`);

    if (++PoopCamStats.totalrequests == 1) {
        broadcast(null, `PoopCam (TM) has been requested 1 time this stream. Keep it up!`);
    } else {
        broadcast(null, `PoopCam (TM) has been requested ${PoopCamStats.totalrequests} times this stream. Keep it up!`);
    }

    var topCammer = PoopCamStats.cammers.length > 0 ? PoopCamStats.cammers[0] : {user:"", requests:0};

    var cammer = PoopCamStats.cammers.find((c) => c.user === user);
    if (cammer === undefined) {
        PoopCamStats.cammers.push({ user: user, requests: 1 });

    } else {
        cammer.requests++;
    }

    PoopCamStats.cammers.sort((a, b) => a.requests - b.requests);

    if (PoopCamStats.cammers[0].user !== topCammer.user) {
        topCammer = PoopCamStats.cammers[0];
        broadcast(null, `${topCammer.user} is now the #1 poopcammer with ${topCammer.requests} requests!`);
    }
}

function getPoopCamStats(channel: string, user: string, args: string[]) {
    weeklyBotPrintUserCommandLog(`Giving ${user} the PoopCam (TM) stats`);

    var found = false;
    var msg = "PoopCam (TM) Stats";
    msg += `...Total Requests ${PoopCamStats.totalrequests}`;
    msg += "...Rankings:";
    for (let i = 0; (i < PoopCamStats.cammers.length && i < 3); i++) {
        msg += `...${i + 1}: ${PoopCamStats.cammers[i].user} - ${PoopCamStats.cammers[i].requests} request(s)`;
        if (PoopCamStats.cammers[i].user === user) {
            found = true;
        }
    }

    if (!found) {
        var idx = PoopCamStats.cammers.findIndex((p) => p.user === user);
        if (idx !== -1) {
            msg += `...${idx + 1}: ${PoopCamStats.cammers[idx].user} - ${PoopCamStats.cammers[idx].requests} request(s)`;
        }
    }

    broadcast(null, msg);
}

function isItWednesday(channel: string, user: string, args: string[]) {
    weeklyBotPrintUserCommandLog(`Telling ${user} if it is Wednesday.`);

    let d = new Date();
    if (d.getDay() === 3) {
        broadcast(null, "IT IS WEDNESDAY!!!! WOOHOO!!!!");
    } else {
        broadcast(null, "It's not Wednesday yet :(");
    }
}

function clipThat(channel: string, user: string, args: string[]) {
    weeklyBotPrintUserCommandLog(`${user} is taking a clip`);
    let channel_str = channel.substring(1).toLowerCase();
    let user_str = user.toLowerCase();
    let delay = channel_str.localeCompare(user_str) !== 0;
    clip(delay);
}

function plates(channel: string, user: string, args: string[]) {
    weeklyBotPrintUserCommandLog(`${user} is commenting on plates`);
    broadcast(null, "Plates are an archaic invention. A bowl can do the exact same thing, but with protective walls. Did you buy the ice cream I asked for? My 20% down payment for it is on the counter. I spent the rest of my money on this small ax.");
}

function requestFeature(channel: string, user: string, args: string[]) {
    let request = args.join(" ");
    weeklyBotPrintUserCommandLog(`${user} is requesting a feature: ${request}`);

    fs.appendFileSync("./requests.txt", `[${new Date().toLocaleString()}] ${user} - ${request} \n`);
    broadcast(null, "Feature requested!");
}

export var LoveStats: { [key: string]: number } = {};

function loveMe(channel: string, user: string , args: string[]) {
    if ((user in LoveStats) == false) {
        LoveStats[user] = 0;
    }

    switch (++LoveStats[user]) {
        default:
            broadcast(null, `I love you ${user}!`);
            break;

        case 5:
            broadcast(null, `I love you ${user}.`);
            break

        case 6:
            broadcast(null, `I love you ${user}...`);
            break;

        case 7:
            broadcast(null, `I love you ${user}, but this is getting a bit much...`);
            break;

        case 8:
            broadcast(null, `${user} you gotta learn to love yourself.`);
            break;

        case 9:
            broadcast(null, `Yo ${user}, you gotta stop with this. I'm warning you.`);
            break;

        case 10:
            broadcast(null, `${user} you messed up by asking for too much love.`);
            timeout(null, user, 10, "You are too desperate for love.");
            LoveStats[user] = 0;
            break;
    }

    weeklyBotPrintUserCommandLog(`${user} is loved: ${LoveStats[user]}`);
}