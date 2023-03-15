// Common utiliy functions.
import { chatClient, apiClient, clientChannels } from './client.js';

import chalk from 'chalk';

let broadcaster_id_map: { [key: string]: string } = {};
export const me = await apiClient.users.getMe();

export function weeklyBotPrint(message: string) {
    process.stdout.cursorTo(0);
    process.stdout.clearLine(0);
    process.stdout.write(message + `\n`);
    prompt();
}

export function prompt() {
    process.stdout.write(chalk.green(chatClient.currentNick + `:`));
}

export async function timeout(excludeChannel: string | null, username: string, duration: number, reason: string) {
    for (const channel of clientChannels) {
        if (channel != excludeChannel) {
            try {
                const user = await apiClient.users.getUserByName(username);
                if (user) {
                    await apiClient.moderation.banUser(broadcaster_id_map[channel], me.id, { duration: duration, reason: reason, userId: user.id });
                }
            } catch (err) {
                weeklyBotPrint(`ERROR: ${err}`)
            }
        }
    }
}

export async function broadcast(excludeChannel: string | null, msg: string) {
    var promises: Promise<void>[] = [];
    for (const channel of clientChannels) {
        if (channel != excludeChannel) {
            promises.push(send(channel, msg));
        }
    }

    await Promise.all(promises);
}

export async function send(channel: string, msg: string): Promise<void> {
    try {
        await chatClient.say(channel, msg, undefined, { limitReachedBehavior: 'throw' });
    } catch (err) {
        weeklyBotPrint(`${err}`);
    }
}

export function addNewBroadcasterId(user: string, id: string) {
    broadcaster_id_map[user] = id;
}

export async function clip(delay: boolean) {
    for (let channel of clientChannels) {
        let broadcaster_id = broadcaster_id_map[channel];
        if (broadcaster_id !== undefined) {
            let stream = await apiClient.streams.getStreamByUserId(broadcaster_id);
            if (stream === null) {
                weeklyBotPrint(`${channel} is not live.`);
            } else {
                try {
                    let id = await apiClient.clips.createClip(({ channelId: broadcaster_id, createAfterDelay: delay }));
                    if ((id !== null) && (id !== undefined) && (id.length > 0)) {
                        send(channel, `${channel} clip: https://clips.twitch.tv/${id}`);
                    }

                } catch (err) {
                    weeklyBotPrint(`${err}`);
                }
            }
        } else {
            weeklyBotPrint(`Could not find matching id for ${channel}`);
        }
    }
}