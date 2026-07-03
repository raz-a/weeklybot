// Tracks the timestamp of each key's most recent event and reports whether a new event
// lands within a "burst" window of the previous one. Used to detect rapid repeat
// !poopcam requests (a burst earns an extra WeWeCoin). Pure and in-memory (no
// persistence, no IO) so it is trivially unit-testable and cheap.
export class BurstTracker {
    #windowMs: number;
    #last = new Map<string, number>();

    constructor(windowMs: number) {
        this.#windowMs = windowMs;
    }

    // Records an event for `key` at `now` (epoch ms) and returns true if it falls within
    // the burst window of this key's previous recorded event.
    record(key: string, now: number = Date.now()): boolean {
        const previous = this.#last.get(key);
        this.#last.set(key, now);
        return previous !== undefined && now - previous <= this.#windowMs;
    }

    reset(): void {
        this.#last.clear();
    }
}
