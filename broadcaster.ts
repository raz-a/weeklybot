import { HelixUser } from "@twurple/api";
import { apiClient, chatClient } from "./client.js";
import { Command, CommandSet } from "./commands.js";
import { ChatUser } from "@twurple/chat";
import { broadcast, getChatGroups, isSharedChatActive, send, weeklyBotPrint } from "./util.js";

let broadcasterSet = new Map<string, HelixUser>();

export function getBroadcasterIdFromChannel(channel: string): HelixUser | undefined {
    return broadcasterSet.get(channel);
}

export function isBroadcasterAdded(channel: string): boolean {
    return broadcasterSet.has(channel);
}

export async function addBroadcaster(channel: string): Promise<boolean> {
    let user = await apiClient.users.getUserByName(channel);
    if (user) {
        await chatClient.join(channel);
        broadcasterSet.set(channel, user);
        return true;
    }

    return false;
}

export function removeBroadcaster(channel: string): boolean {
    if (channel == "razstrats") {
        return false;
    }

    chatClient.part(channel);
    return broadcasterSet.delete(channel);
}

export function getBroadcasterChannels(): IterableIterator<string> {
    return broadcasterSet.keys();
}

export function getFirstBroadcasterChannel(): string | null {
    const first = getBroadcasterChannels().next();
    if (!first.done) {
        return first.value;
    }

    return null;
}

export function getBroadcasterIds(): IterableIterator<HelixUser> {
    return broadcasterSet.values();
}

export const broadcastercommands = new CommandSet(
    "Broadcaster Command",
    "~",
    isBroadcaster,
    new Command(add, "Adds a channel to the WeeklyBot chat."),
    new Command(remove, "Removes a channel from the WeeklyBot chat."),
    new Command(list, "Gets the list of broadcasters currently connected."),
    new Command(
        relay,
        "Shows the current relay status (automatic, based on Twitch Shared Chat)."
    ),
    new Command(reboot, "Reboots WeeklyBot")
);

async function reboot(args: string[], broadcaster: ChatUser) {
    let channel = broadcaster.userName;

    broadcastercommands.log(`${channel} ~reboot`);

    await broadcast("WeeklyBot is rebooting...");

    process.exit(0);
}

async function isBroadcaster(broadcaster: ChatUser) {
    return broadcaster.isBroadcaster;
}

function relay(args: string[], broadcaster: ChatUser) {
    let channel = broadcaster.userName;

    broadcastercommands.log(`${channel} ~relay`);

    if (isSharedChatActive()) {
        const groups = getChatGroups()
            .map((group) => group.join(" + "))
            .join(", ");
        send(
            channel,
            `Relay is automatic. A Twitch Shared Chat session is active; WeeklyBot is bridging these chat groups: ${groups}`
        );
    } else {
        send(
            channel,
            "Relay is automatic. No Shared Chat session detected, so WeeklyBot is relaying between all connected channels."
        );
    }
}
async function add(args: string[], broadcaster: ChatUser) {
    let channel = args[0];

    broadcastercommands.log(`${broadcaster.userName} ~add ${channel}`);

    var msg;
    if (isBroadcasterAdded(channel)) {
        msg = `${channel} is already in WeeklyBot chat.`;
    } else if (await addBroadcaster(channel)) {
        msg = `Added ${channel} to WeeklyBot chat!`;
    } else {
        msg = `Could not add ${channel} to WeeklyBot chat.`;
    }

    broadcast(msg);
}

function remove(args: string[], broadcaster: ChatUser) {
    let channel = args[0];

    broadcastercommands.log(`${broadcaster.userName} ~remove ${channel}`);

    if (removeBroadcaster(channel)) {
        broadcast(`Removed ${channel} from the WeeklyBot chat`);
    } else {
        broadcast(`Could not remove ${channel} from the WeeklyBot chat`);
    }
}

function list(args: string[], broadcaster: ChatUser) {
    broadcastercommands.log(`${broadcaster.userName} ~list`);

    let msg = "Broadcasters in WeeklyBot chat: ";
    for (const channel of getBroadcasterChannels()) {
        msg += `${channel} `;
    }

    broadcast(msg);
}
