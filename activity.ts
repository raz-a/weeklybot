export type MessageActivity = {
    userName: string;
    count: number;
};

// Tracks how many messages each chatter has sent during the current lottery window.
// It is deliberately pure and in-memory (no persistence, no Twitch client / IO) so the
// weighted-draw logic stays trivially unit-testable, mirroring burst.ts. The window is
// short-lived (cleared every few minutes), so losing the counts on a restart is fine.
//
// Counts are keyed by a normalized (trimmed, lowercased) user name so the same viewer is
// counted once regardless of display casing; the latest display name seen is preserved
// for announcements.
export class MessageActivityTracker {
    #counts = new Map<string, MessageActivity>();

    static #normalize(userName: string): string {
        return userName.trim().toLowerCase();
    }

    // Records one message from `userName`, incrementing their count for this window.
    record(userName: string): void {
        const key = MessageActivityTracker.#normalize(userName);
        if (!key) {
            return;
        }
        const existing = this.#counts.get(key);
        this.#counts.set(key, {
            userName: userName.trim(),
            count: (existing?.count ?? 0) + 1,
        });
    }

    getCount(userName: string): number {
        const key = MessageActivityTracker.#normalize(userName);
        return this.#counts.get(key)?.count ?? 0;
    }

    // Total messages counted across all users this window.
    total(): number {
        let sum = 0;
        for (const activity of this.#counts.values()) {
            sum += activity.count;
        }
        return sum;
    }

    entries(): MessageActivity[] {
        return [...this.#counts.values()];
    }

    // Picks a winner at random, weighted by message count, and returns their display name
    // (or null when no messages were counted this window). `random` is injectable so tests
    // can drive the draw deterministically; it must return a value in [0, 1).
    pickWeightedWinner(random: () => number = Math.random): string | null {
        const entries = this.entries();
        const total = this.total();
        if (entries.length === 0 || total <= 0) {
            return null;
        }

        let threshold = random() * total;
        for (const activity of entries) {
            threshold -= activity.count;
            if (threshold < 0) {
                return activity.userName;
            }
        }

        // Fallback for floating-point rounding at the very top of the range.
        return entries[entries.length - 1].userName;
    }

    // Wipes every count so the next window starts fresh.
    clear(): void {
        this.#counts.clear();
    }
}

// Shared singleton used by the running bot; tests build their own tracker so counts stay
// isolated and the draw stays deterministic.
export const messageActivity = new MessageActivityTracker();
