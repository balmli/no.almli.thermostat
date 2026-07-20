import {describe, expect, it, vi} from 'vitest';
import {DeviceCalculator} from '../lib/DeviceCalculator';
import {Devices} from '../lib/Devices';
import {DeviceRequest, DeviceRequests, DeviceClass, DRIVER_VTHERMO} from '../lib/types';
import {Zones} from '../lib/Zones';
import {makeApiDevice, makeZone} from './helpers';

function request(values: Partial<DeviceRequest>): DeviceRequests {
    const requests = new DeviceRequests();
    requests.addRequest(Object.assign(new DeviceRequest(), values));
    return requests;
}

describe('Devices registry', () => {
    it('registers valid supported devices and ignores unavailable or unsupported ones', () => {
        const supported = makeApiDevice({id: 'sensor', capabilities: {measure_temperature: 20}});
        const unavailable = makeApiDevice({id: 'unavailable', capabilities: {measure_temperature: 20}});
        unavailable.available = false;
        const unsupported = makeApiDevice({id: 'unsupported', deviceClass: 'speaker', capabilities: {onoff: true}});
        const devices = new Devices({supported, unavailable, unsupported} as any);
        expect(devices.getDevices().map(device => device.id)).toEqual(['sensor']);
        expect(devices.validAndSupported(supported)).toBe(true);
        expect(devices.validAndSupported(unavailable)).toBe(false);
        expect(devices.validAndSupported(unsupported)).toBe(false);
    });

    it('accepts supported classes and temperature/alarm capabilities', () => {
        const devices = new Devices();
        expect(devices.validAndSupported(makeApiDevice({deviceClass: DeviceClass.fan}))).toBe(true);
        expect(
            devices.validAndSupported(makeApiDevice({deviceClass: 'other', capabilities: {measure_temperature: 20}})),
        ).toBe(true);
        expect(
            devices.validAndSupported(makeApiDevice({deviceClass: 'other', capabilities: {alarm_contact: false}})),
        ).toBe(true);
    });

    it('filters physical classes, virtual classes and app-specific virtual drivers correctly', () => {
        const physical = makeApiDevice({id: 'physical', deviceClass: DeviceClass.thermostat});
        const virtual = makeApiDevice({
            id: 'virtual',
            driverId: DRIVER_VTHERMO,
            deviceClass: DeviceClass.thermostat,
            capabilities: {target_temperature: 20},
        });
        const virtualHeater = makeApiDevice({
            id: 'virtual-heater',
            deviceClass: 'socket',
            virtualClass: DeviceClass.heater,
        });
        const devices = new Devices({physical, virtual, virtualHeater} as any);
        expect(devices.getDevices(DeviceClass.thermostat).map(device => device.id)).toEqual(['physical']);
        expect(devices.getDevices(DeviceClass.vthermo).map(device => device.id)).toEqual(['virtual']);
        expect(devices.getDevices(DeviceClass.heater).map(device => device.id)).toEqual(['virtual-heater']);
    });

    it('looks devices up by API id, local data id and zone', () => {
        const one = makeApiDevice({id: 'one', dataId: 'data-one', zone: 'one'});
        const two = makeApiDevice({id: 'two', zone: 'two'});
        const devices = new Devices({one, two} as any);
        expect(devices.getDevice('one')?.id).toBe('one');
        expect(devices.getDeviceByDataId('data-one')?.id).toBe('one');
        expect(devices.getDevicesFromZone('two')?.map(device => device.id)).toEqual(['two']);
        expect(devices.getDevicesFromZones([makeZone('one'), makeZone('two')])?.map(device => device.id)).toEqual([
            'one',
            'two',
        ]);
        expect(devices.getDevicesFromZones(undefined)).toBeUndefined();
    });

    it('detects active contact and motion alarms only on sensors in scope', () => {
        const contact = makeApiDevice({id: 'contact', zone: 'one', capabilities: {alarm_contact: true}});
        const motion = makeApiDevice({id: 'motion', zone: 'two', capabilities: {alarm_motion: true}});
        const nonSensor = makeApiDevice({
            id: 'other',
            zone: 'one',
            deviceClass: DeviceClass.heater,
            capabilities: {alarm_contact: true},
        });
        const devices = new Devices({contact, motion, nonSensor} as any);
        expect(devices.hasContactAlarm(makeZone('one'))).toBe(true);
        expect(devices.hasContactAlarm(makeZone('two'))).toBe(false);
        expect(devices.hasMotionAlarm([makeZone('one'), makeZone('two')])).toBe(true);
        expect(devices.hasMotionAlarm(undefined)).toBe(false);
    });

    it('updates by local data id only when changed and schedules an immediate calculation', () => {
        const api = makeApiDevice({
            id: 'virtual',
            dataId: 'data-id',
            driverId: DRIVER_VTHERMO,
            capabilities: {target_temperature: 20},
        });
        const logger = {debug: vi.fn(), warn: vi.fn(), info: vi.fn()};
        const calculator = {startCalculation: vi.fn()};
        const devices = new Devices({api} as any, undefined, logger);
        devices.setCalculator(calculator as any);
        devices.updateByDataId('data-id', 'target_temperature', 21);
        devices.updateByDataId('data-id', 'target_temperature', 21);
        devices.updateByDataId('missing', 'target_temperature', 21);
        expect(devices.getDevice('virtual')?.getLocalCapabilityValue('target_temperature').value).toBe(21);
        expect(calculator.startCalculation).toHaveBeenCalledTimes(1);
        expect(calculator.startCalculation).toHaveBeenCalledWith(1);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('unknown device'));
    });

    it('subscribes to supported capabilities, reacts to changes and destroys subscriptions', () => {
        const callbacks = new Map<string, (value: unknown) => void>();
        const destroys: ReturnType<typeof vi.fn>[] = [];
        const api = makeApiDevice({id: 'sensor', capabilities: {measure_temperature: 20, onoff: false}});
        api.makeCapabilityInstance = vi.fn((id: string, callback: (value: unknown) => void) => {
            callbacks.set(id, callback);
            const destroy = vi.fn();
            destroys.push(destroy);
            return {destroy};
        });
        const calculator = {startCalculation: vi.fn()};
        const devices = new Devices({api} as any);
        devices.setCalculator(calculator as any);
        callbacks.get('measure_temperature')!(21);
        callbacks.get('measure_temperature')!(21);
        expect(devices.getDevice('sensor')?.getLocalCapabilityValue('measure_temperature').value).toBe(21);
        expect(calculator.startCalculation).toHaveBeenCalledTimes(1);
        devices.destroy();
        expect(destroys.every(destroy => destroy.mock.calls.length === 1)).toBe(true);
    });

    it('creates, updates and deletes devices', () => {
        const calculator = {startCalculation: vi.fn()};
        const devices = new Devices();
        devices.setCalculator(calculator as any);
        const created = makeApiDevice({id: 'device', name: 'Old', zone: 'one'});
        expect(devices.createOrUpdateDevice(created)?.name).toBe('Old');
        expect(devices.createOrUpdateDevice({...created, name: 'New', zone: 'two'} as any)?.name).toBe('New');
        devices.deleteDevice(created);
        devices.deleteDevice(created);
        expect(devices.getDevice('device')).toBeUndefined();
        expect(calculator.startCalculation).toHaveBeenCalledTimes(2);
    });
});

describe('Devices updates to Homey', () => {
    it('updates local virtual devices, stores humidity and fires triggers', async () => {
        const addValue = vi.fn();
        const localDevice = {
            setCapabilityValue: vi.fn().mockResolvedValue(undefined),
            getValueStore: () => ({addValue}),
            getName: () => 'Humidity',
        };
        const trigger = vi.fn().mockResolvedValue(undefined);
        const homey = {
            app: {getDeviceByDataId: vi.fn().mockReturnValue(localDevice)},
            flow: {getDeviceTriggerCard: vi.fn().mockReturnValue({trigger})},
        };
        const devices = new Devices(undefined, homey);
        await devices.updateDevices(
            request({
                id: 'virtual',
                dataId: 'data-id',
                capabilityId: 'measure_humidity',
                value: 55,
                trigger: 'vh_onoff_true',
            }),
        );
        expect(localDevice.setCapabilityValue).toHaveBeenCalledWith('measure_humidity', 55);
        expect(addValue).toHaveBeenCalledWith(55);
        expect(trigger).toHaveBeenCalledWith(localDevice, {state: 1}, {});
    });

    it('awaits physical updates before applying a configured delay', async () => {
        const setCapabilityValue = vi.fn().mockResolvedValue(undefined);
        const delay = vi.fn().mockResolvedValue(undefined);
        const devices = new Devices(undefined, {app: {setCapabilityValue, delay}});
        await devices.updateDevices(request({id: 'heater', capabilityId: 'onoff', value: true, deviceDelay: 250}));
        expect(setCapabilityValue).toHaveBeenCalledWith('heater', 'onoff', true);
        expect(delay).toHaveBeenCalledWith(250);
        expect(setCapabilityValue.mock.invocationCallOrder[0]).toBeLessThan(delay.mock.invocationCallOrder[0]);
    });

    it('does not resolve until an undelayed physical update completes', async () => {
        let finishWrite!: () => void;
        const write = new Promise<void>(resolve => {
            finishWrite = resolve;
        });
        const devices = new Devices(undefined, {
            app: {setCapabilityValue: vi.fn().mockReturnValue(write)},
        });
        let completed = false;
        const operation = devices
            .updateDevices(request({id: 'heater', capabilityId: 'onoff', value: true}))
            .then(() => {
                completed = true;
            });
        await Promise.resolve();
        const completedBeforeWrite = completed;
        finishWrite();
        await operation;
        expect(completedBeforeWrite).toBe(false);
    });

    it('keeps a rejected physical update eligible for the next calculation', async () => {
        const heater = makeApiDevice({id: 'heater', deviceClass: DeviceClass.heater, capabilities: {onoff: true}});
        const startCalculation = vi.fn();
        const devices = new Devices({heater} as any, {
            app: {setCapabilityValue: vi.fn().mockRejectedValue(new Error('offline'))},
        });
        devices.setCalculator({startCalculation} as any);
        const calculator = new DeviceCalculator(new Zones(), devices);
        const physical = devices.getDevice('heater')!;

        const first = calculator.updateAndCreateDeviceRequestIfChanged(physical, 'onoff', false);
        await devices.updateDevices(request(first!));
        const retry = calculator.updateAndCreateDeviceRequestIfChanged(physical, 'onoff', false);

        expect(physical.getLocalCapabilityValue('onoff').value).toBe(true);
        expect(retry).toMatchObject({id: 'heater', capabilityId: 'onoff', value: false});
        expect(startCalculation).toHaveBeenCalledWith(5000);
    });

    it('bounds automatic retries while a physical update remains unconfirmed', async () => {
        const heater = makeApiDevice({id: 'heater', deviceClass: DeviceClass.heater, capabilities: {onoff: true}});
        const setCapabilityValue = vi.fn().mockResolvedValue(undefined);
        const startCalculation = vi.fn();
        const logger = {error: vi.fn(), verbose: vi.fn(), info: vi.fn()};
        const devices = new Devices({heater} as any, {app: {setCapabilityValue}}, logger);
        devices.setCalculator({startCalculation} as any);
        const off = request({id: 'heater', capabilityId: 'onoff', value: false});

        await devices.updateDevices(off);
        await devices.updateDevices(off);
        await devices.updateDevices(off);

        expect(setCapabilityValue).toHaveBeenCalledTimes(3);
        expect(devices.getDevice('heater')?.getLocalCapabilityValue('onoff').value).toBe(true);
        expect(startCalculation.mock.calls).toEqual([[5000], [10000]]);
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('not confirmed after 3 attempts'),
            off.getRequests()[0],
        );
    });

    it('stops retrying when a capability event confirms the physical update', async () => {
        let capabilityListener!: (value: unknown) => void;
        const heater = makeApiDevice({id: 'heater', deviceClass: DeviceClass.heater, capabilities: {onoff: true}});
        heater.makeCapabilityInstance = vi.fn((_id: string, listener: (value: unknown) => void) => {
            capabilityListener = listener;
            return {destroy: vi.fn()};
        });
        const setCapabilityValue = vi.fn().mockImplementation(async () => capabilityListener(false));
        const startCalculation = vi.fn();
        const devices = new Devices({heater} as any, {app: {setCapabilityValue}});
        devices.setCalculator({startCalculation} as any);

        await devices.updateDevices(request({id: 'heater', capabilityId: 'onoff', value: false}));

        expect(devices.getDevice('heater')?.getLocalCapabilityValue('onoff').value).toBe(false);
        expect(startCalculation).toHaveBeenCalledTimes(1);
        expect(startCalculation).toHaveBeenCalledWith();
    });

    it('logs and continues when a local device or physical write is unavailable', async () => {
        const logger = {warn: vi.fn(), error: vi.fn()};
        const homey = {
            app: {
                getDeviceByDataId: vi.fn().mockReturnValue(undefined),
                setCapabilityValue: vi
                    .fn()
                    .mockRejectedValueOnce(new Error('offline'))
                    .mockResolvedValueOnce(undefined),
            },
        };
        const devices = new Devices(undefined, homey, logger);
        const requests = new DeviceRequests();
        requests.addRequest(
            Object.assign(new DeviceRequest(), {
                id: 'local',
                dataId: 'missing',
                capabilityId: 'onoff',
                value: true,
            }),
        );
        requests.addRequest(
            Object.assign(new DeviceRequest(), {id: 'physical', capabilityId: 'onoff', value: true, deviceDelay: 1}),
        );
        requests.addRequest(
            Object.assign(new DeviceRequest(), {id: 'next', capabilityId: 'onoff', value: false, deviceDelay: 1}),
        );
        await devices.updateDevices(requests);
        expect(logger.warn).toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
        expect(homey.app.setCapabilityValue).toHaveBeenCalledTimes(2);
    });
});
