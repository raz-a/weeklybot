// Common utiliy functions.
import { HelixUser } from "@twurple/api";
import { chatClient, apiClient, clientChannels } from "./client.js";
import { ChatUser } from "@twurple/chat";
import chalk from "chalk";

let broadcaster_id_map: { [key: string]: HelixUser } = {};
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

export async function timeout(
    excludeChannel: string | null,
    username: string,
    duration: number,
    reason: string
) {
    for (const channel of clientChannels) {
        if (channel != excludeChannel) {
            try {
                const user = await apiClient.users.getUserByName(username);
                if (user) {
                    await apiClient.moderation.banUser(broadcaster_id_map[channel], me, {
                        duration: duration,
                        reason: reason,
                        userId: user.id,
                    });
                }
            } catch (err) {
                weeklyBotPrint(`ERROR: ${err}`);
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
        await chatClient.say(channel, msg, undefined, { limitReachedBehavior: "throw" });
    } catch (err) {
        weeklyBotPrint(`${err}`);
    }
}

export function addNewBroadcaster(user: string, id: HelixUser) {
    broadcaster_id_map[user] = id;
}

export async function clipIt(delay: boolean) {
    for (let channel of clientChannels) {
        let broadcaster_id = broadcaster_id_map[channel];
        if (broadcaster_id !== undefined) {
            let stream = await apiClient.streams.getStreamByUserId(broadcaster_id);
            if (stream === null) {
                weeklyBotPrint(`${channel} is not live.`);
            } else {
                try {
                    let id = await apiClient.clips.createClip({
                        channelId: broadcaster_id,
                        createAfterDelay: delay,
                    });
                    if (id !== null && id !== undefined && id.length > 0) {
                        let clip = 'https://clips.twitch.tv/' + id.toString()
                        send(channel, `${channel} clip: ${clip}`);
                        //let user = ChatUser.userId
                        //await HelixUser.whispers.sendWhisper( /*weeklybot id, */ user, clip)
                        //note: there are many ways this command could fail
                        //weeklybot needs to have a phonenumber associated with it to be allowed to send whispers
                        //additionally so does the user receiving the whisper
                        //the user making the command also needs to have whispers turned on 
                        //weeklybot needs the whisper permission included as part of its token
                        //both weeklybot and the receiving user have a limit of 40 unique user whispers per day
                        //full documentation: https://dev.twitch.tv/docs/api/reference/#send-whisper
                        //it would likely be better if this was a separate method in order to check for all of these errors
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

export function getBroadcasterList(): Readonly<HelixUser>[] {
    return Object.values(broadcaster_id_map);
}
