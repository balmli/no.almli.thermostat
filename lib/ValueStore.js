'use strict';

module.exports = class ValueStore {

    constructor() {
        this._maxAge = 3600000; // Max 1 hour
        this._store = {};
    }

    size() {
        return Object.keys(this._store).length;
    }

    getStore() {
        return this._store;
    }

    addValue(aValue, aTimestamp) {
        const now = aTimestamp || new Date().getTime();
        this._store[now] = {
            value: aValue
        };
        this.clearOldEntries(aTimestamp);
    }

    clearOldEntries(aTimestamp) {
        const minTs = (aTimestamp || new Date().getTime()) - this._maxAge;
        Object.keys(this._store).forEach(key => {
            if (key < minTs) {
                delete this._store[key];
            }
        });
    }

    sameAgeOrOlderThan(aTimestamp) {
        const keys = Object.keys(this._store)
            .sort()
            .reverse()
            .filter(key => key <= aTimestamp);
        return keys.length > 0 ? this._store[keys[0]] : undefined;
    }

    changePctPointsLastMinutes(minutes, aTimestamp) {
        const now = aTimestamp || new Date().getTime();
        const ts = now - (minutes * 60000);
        const newest = this.sameAgeOrOlderThan(now);
        const newestOlderThan = this.sameAgeOrOlderThan(ts);
        return newest && newestOlderThan ? newest.value - newestOlderThan.value : undefined;
    }

};
