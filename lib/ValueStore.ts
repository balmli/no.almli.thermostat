export class ValueStore {

    _maxAge: number;
    _store: Map<number, number>;

    constructor() {
        this._maxAge = 3600000; // Max 1 hour
        this._store = new Map<number, number>();
    }

    size(): number {
        return this._store.size;
    }

    getStore(): Map<number, number> {
        return this._store;
    }

    addValue(aValue: number, aTimestamp: number): void {
        const now = aTimestamp || new Date().getTime();
        this._store.set(now, aValue);
        this.clearOldEntries(aTimestamp);
    }

    clearOldEntries(aTimestamp: number): void {
        const minTs = (aTimestamp || new Date().getTime()) - this._maxAge;
        for (const key of this._store.keys()) {
            if (key < minTs) {
                this._store.delete(key);
            }
        }
    }

    sameAgeOrOlderThan(aTimestamp: number): number | undefined {
        const keys = [...this._store.keys()]
            .sort()
            .reverse()
            .filter(key => key <= aTimestamp);
        return keys.length > 0 ? this._store.get(keys[0]) : undefined;
    }

    changePctPointsLastMinutes(minutes: number, aTimestamp: number): number | undefined {
        const now = aTimestamp || Date.now();
        const ts = now - (minutes * 60000);
        const newest = this.sameAgeOrOlderThan(now);
        const newestOlderThan = this.sameAgeOrOlderThan(ts);
        return newest && newestOlderThan ? newest - newestOlderThan : undefined;
    }

}
