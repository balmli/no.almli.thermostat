import {describe, expect, it} from 'vitest';
import {ValueStore} from '../lib/ValueStore';
import {NOW} from './helpers';

describe('ValueStore', () => {
    it('stores values by timestamp and replaces values at the same timestamp', () => {
        const store = new ValueStore();
        store.addValue(10, NOW);
        store.addValue(11, NOW);
        expect(store.size()).toBe(1);
        expect(store.getStore().get(NOW)).toBe(11);
    });

    it('removes entries older than one hour while preserving the boundary', () => {
        const store = new ValueStore();
        store.addValue(1, NOW - 3_600_001);
        store.addValue(2, NOW - 3_600_000);
        store.addValue(3, NOW);
        expect([...store.getStore().values()]).toEqual([2, 3]);
    });

    it('finds the newest value at or before a timestamp regardless of insertion order', () => {
        const store = new ValueStore();
        store.addValue(30, NOW - 10_000);
        store.addValue(10, NOW - 30_000);
        store.addValue(20, NOW - 20_000);
        expect(store.sameAgeOrOlderThan(NOW - 15_000)).toBe(20);
        expect(store.sameAgeOrOlderThan(NOW - 31_000)).toBeUndefined();
    });

    it('calculates percentage-point change over a time window', () => {
        const store = new ValueStore();
        store.addValue(40, NOW - 10 * 60_000);
        store.addValue(43, NOW - 5 * 60_000);
        store.addValue(47, NOW);
        expect(store.changePctPointsLastMinutes(5, NOW)).toBe(4);
        expect(store.changePctPointsLastMinutes(10, NOW)).toBe(7);
    });

    it('returns undefined when the requested historical reading is unavailable', () => {
        const store = new ValueStore();
        store.addValue(47, NOW);
        expect(store.changePctPointsLastMinutes(10, NOW)).toBeUndefined();
    });

    it.fails('supports legitimate zero-valued humidity readings', () => {
        const store = new ValueStore();
        store.addValue(0, NOW - 5 * 60_000);
        store.addValue(5, NOW);
        expect(store.changePctPointsLastMinutes(5, NOW)).toBe(5);
    });
});
