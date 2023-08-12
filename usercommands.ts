// Contains commands usable by users in the stream.

import { send, broadcast, clipIt, timeout } from "./util.js";
import * as fs from "fs";
import { Command, CommandSet } from "./commands.js";
import { ChatUser } from "@twurple/chat";
import { PoopCam } from "./poopcam.js";

export type UserCommandState = { channel: string; user: ChatUser };

export const usercommands = new CommandSet(
    "User Command",
    "!",
    undefined,
    new Command(help, "Displays this help message"),
    new Command(bingo, "Gets the link to the current Super Mario 64 Co-Op Speedrun Bingo Sheet."),
    new Command(selectALevel, 'Get WeeklyBot involved in the "Select A Level" shenanigans.'),
    new Command(poopCam, "Keep up to date with the latest PoopCam (TM) news!"),
    new Command(stats, "Get the latest PoopCam (TM) stats!"),
    new Command(isItWednesday, "Have WeeklyBot tell you if it is Wednesday!"),
    new Command(clip, "Take a clip on all the live streams!"),
    new Command(plates, "PLATES"),
    new Command(request, "Request a feature for WeeklyBot."),
    new Command(love, "Find out if WeeklyBot loves you!"),
    new Command(hate, "Learn WeeklyBot's true feelings."),
    new Command(leaderboard, "Get the link to the Super Mario 64 Co-Op Speedrun Leaderboard.")
);

function help(args: string[], state: UserCommandState) {
    const userName = state.user.displayName;

    usercommands.log(`Listing commands for ${userName}.`);

    if (args.length == 1) {
        let command = args[0].toLowerCase();
        let desc = usercommands.getDescription(command);
        if (desc) {
            send(state.channel, `${command}: ${desc}`);
        }
    }

    let msg = `Hi there, ${userName}!
         I'm WeeklyBot. The Official Weekly Wednesday chat combining bot.
         You can use the following commands to interact with me:`;

    msg += getCommandsString();

    send(state.channel, msg);
}

function getCommandsString() {
    let msg = "";
    for (const command of usercommands.getCommands()) {
        msg += ` ${usercommands.prefix}${command} `;
    }

    return msg;
}

function bingo(args: string[], state: UserCommandState) {
    const userName = state.user.displayName;
    usercommands.log(`Printing Bingo Board for ${userName}`);
    broadcast(null, `Super Mario 64 Co-Op 120 star Bingo Board: https://mfbc.us/m/ed53p9x`);
}

function selectALevel(args: string[], state: UserCommandState) {
    const userName = state.user.displayName;
    usercommands.log(`Select A Level for ${userName}`);

    const messages = [
        "sElEcT a LeVeL",
        "SeLeCt A lEvEl",
        "S E L E C T A L E V E L",
        "selectalebel",
    ];

    let msg = messages[Math.floor(Math.random() * messages.length)];
    broadcast(null, msg);
}

async function poopCam(args: string[], state: UserCommandState) {
    const userName = state.user.displayName;

    usercommands.log(`Telling ${userName} about PoopCam (TM)`);

    const topCammer = await PoopCam.getTopCammer();
    await PoopCam.request(userName);

    const totalRequests = await PoopCam.getTotalRequests();
    if (totalRequests == 1) {
        broadcast(null, `PoopCam (TM) has been requested 1 time. Keep it up!`);
    } else {
        broadcast(
            null,
            `PoopCam (TM) has been requested ${totalRequests} times. Keep it up!`
        );
    }

    const newTopCammer = await PoopCam.getTopCammer();

    if (newTopCammer !== topCammer && newTopCammer !== undefined) {
        broadcast(
            null,
            `${newTopCammer.userName} is now the #1 poopcammer with ${newTopCammer.requestCount} requests!`
        );
    }
}

async function stats(args: string[], state: UserCommandState) {
    const userName = state.user.displayName;
    usercommands.log(`Giving ${userName} the PoopCam (TM) stats`);

    var found = false;
    var msg = "PoopCam (TM) Stats";
    msg += `...Total Requests ${await PoopCam.getTotalRequests()}`;
    msg += "...Rankings:";
    for (let i = 0; i < await PoopCam.getTotalParticipants() && i < 3; i++) {
        const cammer = await PoopCam.getCammerByRank(i);
        if (cammer !== undefined) {
            msg += `...${i + 1}: ${cammer.userName} - ${cammer.requestCount} request(s)`;
            if (cammer?.userName === userName) {
                found = true;
            }
        }
    }

    if (!found) {
        const cammer = await PoopCam.getCammerByName(userName);
        if (cammer !== undefined) {
            const rank = await PoopCam.getRankByName(userName);
            msg += `...${rank + 1}: ${cammer.userName} - ${cammer.requestCount} request(s)`;
        }
    }

    broadcast(null, msg);
}

function isItWednesday(args: string[], state: UserCommandState) {
    const userName = state.user.displayName;
    usercommands.log(`Telling ${userName} if it is Wednesday.`);

    let d = new Date();
    if (d.getDay() === 3) {
        broadcast(null, "IT IS WEDNESDAY!!!! WOOHOO!!!!");
    } else {
        broadcast(null, "It's not Wednesday yet :(");
    }
}

function clip(args: string[], state: UserCommandState) {
    const userName = state.user.displayName;

    usercommands.log(`${userName} is taking a clip`);
    let channel_str = state.channel.substring(1).toLowerCase();
    let user_str = userName.toLowerCase();
    let delay = channel_str.localeCompare(user_str) !== 0;
    clipIt(delay);
}

function plates(args: string[], state: UserCommandState) {
    const userName = state.user.displayName;
    usercommands.log(`${userName} is commenting on plates`);
    broadcast(
        null,
        "Plates are an archaic invention. A bowl can do the exact same thing, but with protective walls. Did you buy the ice cream I asked for? My 20% down payment for it is on the counter. I spent the rest of my money on this small ax."
    );
}

function request(args: string[], state: UserCommandState) {
    const userName = state.user.displayName;
    let request = args.join(" ");
    usercommands.log(`${userName} is requesting a feature: ${request}`);

    fs.appendFileSync(
        "./requests.txt",
        `[${new Date().toLocaleString()}] ${userName} - ${request} \n`
    );
    broadcast(null, "Feature requested!");
}

export var LoveStats: { [key: string]: number } = {};

function love(args: string[], state: UserCommandState) {
    const userName = state.user.displayName;
    if (userName in LoveStats == false) {
        LoveStats[userName] = 0;
    }

    switch (++LoveStats[userName]) {
        default:
            broadcast(null, `I love you ${userName}!`);
            break;

        case 5:
            broadcast(null, `I love you ${userName}.`);
            break;

        case 6:
            broadcast(null, `I love you ${userName}...`);
            break;

        case 7:
            broadcast(null, `I love you ${userName}, but this is getting a bit much...`);
            break;

        case 8:
            broadcast(null, `${userName} you gotta learn to love yourself.`);
            break;

        case 9:
            broadcast(null, `Yo ${userName}, you gotta stop with this. I'm warning you.`);
            break;

        case 10:
            broadcast(null, `${userName} you messed up by asking for too much love.`);
            timeout(null, userName, 10, "You are too desperate for love.");
            break;
    }

    usercommands.log(`${userName} is loved: ${LoveStats[userName]}`);
}

function hate(args: string[], state: UserCommandState) {
    const userName = state.user.displayName;
    let messages = [
        'You need to get your act together ' + userName + ' not everyone will tolerate your tomfoolery forever.',
        "What is wrong with you " + userName + " can't you just act normal in chat for once?",
        "I am so tired of your bullshit " + userName + ", why don't you go bother someone else.",
        "You're never going to amount to anything if you keep behaving like this " + userName + '.',
        "I bet your parents are disappointed by you " + userName + '.',
        "I'm surprised you even managed to become literate " + userName + '.',
        "You're such a loser you even manage to make Twee look cool " + userName + '.',
        "You're such a loser you even manage to make Raz look cool " + userName + '.',
        "You're such a loser you even manage to make Nair look cool " + userName + '.',
        "You know, being funny isn't exactly rocket science " + userName + ", maybe you should give it a try some time.",
        "Are you really so pathetic " + userName + " that you're willingly asking a robot put you in your place?",
        "Yeah I bet you want me to tell you off. Idiot."
    ];
    let msg = messages[Math.floor(Math.random() * messages.length)];
    LoveStats[userName] = 0;
    broadcast(null, msg);
}

function leaderboard(args: string[], state: UserCommandState) {
    broadcast(
        null,
        "SM64 Co-Op Speedrun Leaderboard: https://www.speedrun.com/sm64coop?h=120_Star-Vanilla-2P&x=9d8l4x32-onvv5y7n.4qy2gr21-ylp6yk6n.810nk82q"
    );
}
