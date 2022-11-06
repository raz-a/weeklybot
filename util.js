// Common utiliy functions.

import tmi from 'tmi.js';
import chalk from 'chalk';

let client;

export function createClient(opts) {
    client = new tmi.client(opts);
    return client;
}

export function weeklyBotPrint(message) {
    process.stdout.cursorTo(0);
    process.stdout.clearLine();
    process.stdout.write(message + `\n`);
    prompt();
}

export function prompt() {
    process.stdout.write(chalk.green(client.getUsername() + `:`));
}

export function broadcast(excludeChannel, msg, type) {
    for (const channel of client.getChannels()) {
        if (channel != excludeChannel) {
            send(channel, msg, type);
        }
    }
}

export function send(channel, msg, type) {
    switch (type) {
        case "action":
            client.action(channel, msg).catch((err) => {
                weeklyBotPrint(`Broadcast Action Error: ${err}`);
            });

            break;

        case "chat":
            client.say(channel, msg).catch((err) => {
                weeklyBotPrint(`Broadcast Chat Error: ${err}`);
            });

            break;

        default:
            weeklyBotPrint(`Invalid Broadcast Type`);
    }
}

export function clip(channel) {
    const url = 'https://api.twitch.tv/helix/clips';
    fetch(url, {method: "POST", })
}