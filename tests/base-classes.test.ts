import {describe, expect, it} from 'vitest';
import {BaseDevice} from '../lib/BaseDevice';
import {BaseDriver} from '../lib/BaseDriver';

class TestDriver extends BaseDriver {
    getDriverName(): string {
        return 'Test virtual device';
    }
}

describe('Homey base classes', () => {
    it('initializes a device logger and exposes default same-zone class settings', async () => {
        const device = new BaseDevice();
        await device.onInit();
        expect(device.logger).toBeDefined();
        expect(device.getDevicesSettings()).toEqual({zone: {clazz: true}});
    });

    it('initializes a driver logger and requires a concrete driver name', async () => {
        const driver = new BaseDriver();
        await driver.onInit();
        expect(driver.logger).toBeDefined();
        expect(() => driver.getDriverName()).toThrow('Not implemented');
    });

    it('creates pair-list entries with the concrete driver name and a unique id', async () => {
        const driver = new TestDriver();
        const first = await driver.onPairListDevices();
        const second = await driver.onPairListDevices();
        expect(first).toEqual([
            {
                name: 'Test virtual device',
                data: {id: expect.stringMatching(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/)},
            },
        ]);
        expect(second[0].data.id).not.toBe(first[0].data.id);
    });
});
