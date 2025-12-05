import { HelixUser } from "@twurple/api";
import { apiClient, chatClient } from "./client.js";

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
