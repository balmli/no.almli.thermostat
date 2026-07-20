import {describe, expect, it, vi} from 'vitest';
import {DeviceCalculator} from '../lib/DeviceCalculator';
import {Devices} from '../lib/Devices';
import {Zones} from '../lib/Zones';
import {DRIVER_VTHERMO} from '../lib/types';
import {makeDevice} from './helpers';

describe('DeviceCalculator', () => {
    const calculator = () => new DeviceCalculator(new Zones(), new Devices());

    it('requires subclasses to implement calculate', () => {
        expect(() => calculator().calculate({id: 'root', name: 'Root'})).toThrow('Not implemented');
    });

    it('creates a request and updates the local capability when a value changes', () => {
        vi.spyOn(Date, 'now').mockReturnValue(99);
        const device = makeDevice({id: 'heater', name: 'Heater', capabilities: {onoff: false}});
        const request = calculator().updateAndCreateDeviceRequestIfChanged(device, 'onoff', true);
        expect(request).toMatchObject({id: 'heater', capabilityId: 'onoff', value: true});
        expect(JSON.parse(request!.debugInfo)).toMatchObject({name: 'Heater', class: 'sensor'});
        expect(device.getLocalCapabilityValue('onoff')).toMatchObject({value: true, lastUpdated: 99});
    });

    it('does not create requests for unchanged, undefined or unknown values', () => {
        const device = makeDevice({capabilities: {onoff: false}});
        expect(calculator().updateAndCreateDeviceRequestIfChanged(device, 'onoff', false)).toBeUndefined();
        expect(calculator().updateAndCreateDeviceRequestIfChanged(device, 'onoff', undefined)).toBeUndefined();
        expect(calculator().updateAndCreateDeviceRequestIfChanged(device, 'missing', true)).toBeUndefined();
    });

    it('includes data ids only for local virtual devices', () => {
        const virtual = makeDevice({
            dataId: 'local-id',
            driverId: DRIVER_VTHERMO,
            capabilities: {onoff: false},
        });
        const physical = makeDevice({dataId: 'ignored', capabilities: {onoff: false}});
        expect(calculator().updateAndCreateDeviceRequestIfChanged(virtual, 'onoff', true)?.dataId).toBe('local-id');
        expect(calculator().updateAndCreateDeviceRequestIfChanged(physical, 'onoff', true)?.dataId).toBeUndefined();
    });
});
