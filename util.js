// Common utiliy functions.
import { tmiClient, apiClient } from './client.js';

import chalk from 'chalk';

let broadcaster_id_map = {};

export function weeklyBotPrint(message) {
    process.stdout.cursorTo(0);
    process.stdout.clearLine();
    process.stdout.write(message + `\n`);
    prompt();
}

export function prompt() {
    process.stdout.write(chalk.green(tmiClient.getUsername() + `:`));
}

export function broadcast(excludeChannel, msg, type) {
    for (const channel of tmiClient.getChannels()) {
        if (channel != excludeChannel) {
            send(channel, msg, type);
        }
    }
}

export function send(channel, msg, type) {
    switch (type) {
        case "action":
            tmiClient.action(channel, msg).catch((err) => {
                weeklyBotPrint(`Broadcast Action Error: ${err}`);
            });

            break;

        case "chat":
            tmiClient.say(channel, msg).catch((err) => {
                weeklyBotPrint(`Broadcast Chat Error: ${err}`);
            });

            break;

        default:
            weeklyBotPrint(`Invalid Broadcast Type`);
    }
}

export function addNewBroadcasterId(user, id) {
    broadcaster_id_map[user] = id;
}

export function clip(delay) {
    for (let channel of tmiClient.getChannels()) {
        channel = channel.substring(1);
        let broadcaster_id = broadcaster_id_map[channel];
        if (broadcaster_id !== undefined) {

            apiClient.streams.getStreamByUserId(broadcaster_id).then((stream) => {
                if (stream === null) {
                    weeklyBotPrint(`${channel} is not live.`);
                } else {

                    // Capture a clip.
                    apiClient.clips.createClip({ channelId: broadcaster_id, createAfterDelay: delay }).then((id) => {
                        if ((id !== null) && (id !== undefined) && (id.length > 0)) {
                            broadcast(null, `${channel} clip: https://clips.twitch.tv/${id}`, "chat");
                        }
                    });
                }
            });

        } else {
            weeklyBotPrint(`Could not find matching id for ${channel}`);
        }
    }
}