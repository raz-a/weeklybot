// Common utiliy functions.
import { chatClient, apiClient, clientChannels } from './client.js';

import chalk from 'chalk';

let broadcaster_id_map: { [key: string]: string } = {};

export function weeklyBotPrint(message: string) {
    process.stdout.cursorTo(0);
    process.stdout.clearLine(0);
    process.stdout.write(message + `\n`);
    prompt();
}

export function prompt() {
    process.stdout.write(chalk.green(chatClient.currentNick + `:`));
}

export function timeout(excludeChannel: string | null, username: string, duration: number, reason: string) {
    for (const channel of clientChannels) {
        if (channel != excludeChannel) {
            chatClient.timeout(channel, username, duration, reason).catch((err) => {
                weeklyBotPrint(`ERROR: ${err}`)
            });
        }
    }

}

export function broadcast(excludeChannel: string | null, msg: string): Promise<void[]> {
    var promises: Promise<void>[] = [];
    for (const channel of clientChannels) {
        if (channel != excludeChannel) {
            promises.push(send(channel, msg));
        }
    }

    return Promise.all(promises);
}

export function send(channel: string, msg: string): Promise<void> {
    return chatClient.say(channel, msg, undefined, {limitReachedBehavior: 'throw'} ).catch((err) => {
        weeklyBotPrint(`${err}`);
    });
}

export function addNewBroadcasterId(user: string, id: string ) {
    broadcaster_id_map[user] = id;
}

export function clip(delay: boolean) {
    for (let channel of clientChannels) {
        let broadcaster_id = broadcaster_id_map[channel];
        if (broadcaster_id !== undefined) {

            apiClient.streams.getStreamByUserId(broadcaster_id).then((stream) => {
                if (stream === null) {
                    weeklyBotPrint(`${channel} is not live.`);
                } else {

                    // Capture a clip.
                    apiClient.clips.createClip({ channelId: broadcaster_id, createAfterDelay: delay }).then((id) => {
                        if ((id !== null) && (id !== undefined) && (id.length > 0)) {
                            send(channel, `${channel} clip: https://clips.twitch.tv/${id}`);
                        }
                    }).catch((err) => {
                        weeklyBotPrint(`${err}`)
                    });
                }
            });

        } else {
            weeklyBotPrint(`Could not find matching id for ${channel}`);
        }
    }
}