import {describe, expect, it, vi} from 'vitest';
import {DeviceCapability} from '../lib/types';
import * as math from '../lib/math';
import {NOW} from './helpers';

describe('math', () => {
    it('rounds to two decimal places', () => {
        expect(math.round(12.345)).toBe(12.35);
        expect(math.round(-1.235)).toBe(-1.24);
    });

    it('calculates average, minimum and maximum values', () => {
        const values = [new DeviceCapability(10, NOW), new DeviceCapability(20, NOW), new DeviceCapability(30, NOW)];
        expect(math.average(values)).toBe(20);
        expect(math.min(values)).toBe(10);
        expect(math.max(values)).toBe(30);
    });

    it('selects the newest value from numeric and date timestamps', () => {
        expect(
            math.newest([
                {value: 1, lastUpdated: new Date(NOW - 1000).toISOString()},
                {value: 2, lastUpdated: NOW},
            ]),
        ).toBe(2);
    });

    it('filters stale values when multiple measurements exist', () => {
        vi.setSystemTime(NOW);
        const values = [new DeviceCapability(10, NOW - 60_000), new DeviceCapability(20, NOW - 500)];
        expect(math.average(values, 1000)).toBe(20);
        expect(math.min(values, 1000)).toBe(20);
        expect(math.max(values, 1000)).toBe(20);
        vi.useRealTimers();
    });

    it('falls back to the newest reading when all readings are stale', () => {
        vi.setSystemTime(NOW);
        const values = [
            new DeviceCapability(10, NOW - 20_000),
            {value: 15, lastUpdated: new Date(NOW - 10_000).toISOString()},
        ];
        expect(math.average(values, 1000)).toBe(15);
        expect(math.min(values, 1000)).toBe(15);
        expect(math.max(values, 1000)).toBe(15);
        vi.useRealTimers();
    });

    it('keeps a sole reading even when it is old', () => {
        vi.setSystemTime(NOW);
        expect(math.average([new DeviceCapability(5, NOW - 100_000)], 1000)).toBe(5);
        vi.useRealTimers();
    });

    it('creates UUID-shaped identifiers with independent random sections', () => {
        const first = math.guid();
        const second = math.guid();
        expect(first).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
        expect(second).not.toBe(first);
    });
});
