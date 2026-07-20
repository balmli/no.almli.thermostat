import {describe, expect, it, vi} from 'vitest';
import {VHumidityDeviceCalculator} from '../lib/VHumidityDeviceCalculator';
import {Zones} from '../lib/Zones';
import {CalcMethodHumidity, CAPABILITY_ACTIVE, DeviceCapability, DeviceClass} from '../lib/types';
import {makeDevice, makeDevicesStub, makeVHumidity, makeZone, NOW} from './helpers';

describe('VHumidityDeviceCalculator measurements', () => {
    it('uses humidity sensors in the current zone and excludes non-sensors', () => {
        const root = makeZone('root');
        const calculator = new VHumidityDeviceCalculator(
            new Zones(),
            makeDevicesStub([
                makeDevice({id: 'sensor', capabilities: {measure_humidity: 40}}),
                makeDevice({id: 'other', deviceClass: 'other', capabilities: {measure_humidity: 99}}),
                makeDevice({id: 'temperature-only', capabilities: {measure_temperature: 20}}),
            ]),
        );
        expect(calculator.getHumiditiesInZone(root).map(value => value.value)).toEqual([40]);
    });

    it.fails('does not duplicate readings when several zones are selected', () => {
        const zones = [makeZone('one'), makeZone('two')];
        const calculator = new VHumidityDeviceCalculator(
            new Zones(),
            makeDevicesStub([
                makeDevice({id: 'one', zone: 'one', capabilities: {measure_humidity: 40}}),
                makeDevice({id: 'two', zone: 'two', capabilities: {measure_humidity: 60}}),
            ]),
        );
        expect(calculator.getHumiditiesInZone(zones).map(value => value.value)).toEqual([40, 60]);
    });

    it.each([
        [CalcMethodHumidity.AVERAGE, 50],
        [CalcMethodHumidity.MIN, 40],
        [CalcMethodHumidity.MAX, 60],
        [CalcMethodHumidity.NEWEST, 60],
    ])('calculates %s humidity', (calcMethod, expected) => {
        const virtual = makeVHumidity({
            capabilities: {measure_humidity: 0},
            humiditySettings: {calcMethod},
        });
        const calculator = new VHumidityDeviceCalculator(
            new Zones(),
            makeDevicesStub([
                makeDevice({
                    id: 'older',
                    capabilities: {measure_humidity: new DeviceCapability(40, NOW - 1000)},
                }),
                makeDevice({id: 'newer', capabilities: {measure_humidity: new DeviceCapability(60, NOW)}}),
            ]),
        );
        expect(calculator.calculateMeasureHumidity(virtual, makeZone('root'))).toMatchObject({value: expected});
    });

    it('filters old readings when a recent reading remains', () => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
        const virtual = makeVHumidity({
            capabilities: {measure_humidity: 0},
            humiditySettings: {calcMethod: CalcMethodHumidity.AVERAGE, measurementMaxAge: 1000},
        });
        const recentCalculator = new VHumidityDeviceCalculator(
            new Zones(),
            makeDevicesStub([
                makeDevice({
                    id: 'old',
                    capabilities: {measure_humidity: new DeviceCapability(20, NOW - 10_000)},
                }),
                makeDevice({id: 'new', capabilities: {measure_humidity: new DeviceCapability(50, NOW)}}),
            ]),
        );
        expect(recentCalculator.calculateMeasureHumidity(virtual, makeZone('root'))).toMatchObject({value: 50});

        vi.useRealTimers();
    });

    it('falls back to the newest reading when every reading is old', () => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
        const virtual = makeVHumidity({
            capabilities: {measure_humidity: 0},
            humiditySettings: {calcMethod: CalcMethodHumidity.AVERAGE, measurementMaxAge: 1000},
        });
        const calculator = new VHumidityDeviceCalculator(
            new Zones(),
            makeDevicesStub([
                makeDevice({
                    id: 'oldest',
                    capabilities: {measure_humidity: new DeviceCapability(20, NOW - 20_000)},
                }),
                makeDevice({
                    id: 'newest',
                    capabilities: {measure_humidity: new DeviceCapability(30, NOW - 10_000)},
                }),
            ]),
        );
        expect(calculator.calculateMeasureHumidity(virtual, makeZone('root'))).toMatchObject({value: 30});
        vi.useRealTimers();
    });

    it('returns null without a usable sensor and logs unsupported methods', () => {
        const logger = {debug: vi.fn(), error: vi.fn()};
        const virtual = makeVHumidity({
            capabilities: {measure_humidity: 20},
            humiditySettings: {calcMethod: 'UNKNOWN' as CalcMethodHumidity},
        });
        const empty = new VHumidityDeviceCalculator(new Zones(), makeDevicesStub([]), logger);
        expect(empty.calculateMeasureHumidity(virtual, makeZone('root'))).toMatchObject({value: null});

        const withSensor = new VHumidityDeviceCalculator(
            new Zones(),
            makeDevicesStub([makeDevice({capabilities: {measure_humidity: 50}})]),
            logger,
        );
        virtual.setLocalCapabilityValue('measure_humidity', 20);
        expect(withSensor.calculateMeasureHumidity(virtual, makeZone('root'))).toMatchObject({value: null});
        expect(logger.error).toHaveBeenCalledWith('calculatedHumidity: unsupported calc method', 'UNKNOWN');
    });
});

describe('VHumidityDeviceCalculator switching', () => {
    const calculator = () => new VHumidityDeviceCalculator(new Zones(), makeDevicesStub([]));

    it('turns a fan on above and off below the hysteresis band', () => {
        const device = makeVHumidity();
        expect(calculator().resolveOnOff(device, 51.01, 50)).toBe(true);
        expect(calculator().resolveOnOff(device, 48.99, 50)).toBe(false);
    });

    it('does nothing on hysteresis boundaries and within the band', () => {
        const device = makeVHumidity();
        expect(calculator().resolveOnOff(device, 49, 50)).toBeUndefined();
        expect(calculator().resolveOnOff(device, 50, 50)).toBeUndefined();
        expect(calculator().resolveOnOff(device, 51, 50)).toBeUndefined();
    });

    it('supports zero hysteresis without changing state exactly at the target', () => {
        const device = makeVHumidity({deviceSettings: {hysteresis: 0}});
        expect(calculator().resolveOnOff(device, 49.99, 50)).toBe(false);
        expect(calculator().resolveOnOff(device, 50, 50)).toBeUndefined();
        expect(calculator().resolveOnOff(device, 50.01, 50)).toBe(true);
    });

    it('uses the default hysteresis when the setting is undefined', () => {
        const device = makeVHumidity({deviceSettings: {hysteresis: undefined}});
        expect(calculator().resolveOnOff(device, 50.5, 50)).toBeUndefined();
        expect(calculator().resolveOnOff(device, 51.01, 50)).toBe(true);
    });

    it('reverses fan behavior for humidifiers', () => {
        const device = makeVHumidity({deviceSettings: {invert: true}});
        expect(calculator().resolveOnOff(device, 52, 50)).toBe(false);
        expect(calculator().resolveOnOff(device, 48, 50)).toBe(true);
    });

    it('turns an active controller off with the main switch and can ignore that switch', () => {
        const disabled = makeVHumidity({capabilities: {onoff: false, [CAPABILITY_ACTIVE]: true}});
        expect(calculator().resolveOnOff(disabled, 60, 50)).toBe(false);
        const alwaysEnabled = makeVHumidity({
            capabilities: {onoff: false},
            deviceSettings: {onoffEnabled: false},
        });
        expect(calculator().resolveOnOff(alwaysEnabled, 60, 50)).toBe(true);
    });

    it('rejects non-humidity virtual devices and missing settings', () => {
        expect(
            calculator().resolveOnOff(makeDevice({capabilities: {onoff: true, [CAPABILITY_ACTIVE]: false}}), 60, 50),
        ).toBeUndefined();
        const withoutSettings = makeVHumidity();
        withoutSettings.deviceSettings = undefined;
        expect(calculator().resolveOnOff(withoutSettings, 60, 50)).toBeUndefined();
    });

    it('creates controller and fan requests with trigger and device delay', () => {
        const virtual = makeVHumidity({
            capabilities: {measure_humidity: 60, vh_target_humidity: 50, [CAPABILITY_ACTIVE]: false},
            deviceSettings: {deviceDelay: 100},
        });
        const fan = makeDevice({id: 'fan', deviceClass: DeviceClass.fan, capabilities: {onoff: false}});
        const requests = new VHumidityDeviceCalculator(new Zones(), makeDevicesStub([virtual, fan]))
            .calculateFanSwitching(virtual, makeZone('root'))
            .getRequests();
        expect(requests).toEqual([
            expect.objectContaining({capabilityId: CAPABILITY_ACTIVE, value: true, trigger: 'vh_onoff_true'}),
            expect.objectContaining({id: 'fan', capabilityId: 'onoff', value: true, deviceDelay: 100}),
        ]);
    });

    it('does not switch without a target or measured humidity', () => {
        const noTarget = makeVHumidity({capabilities: {vh_target_humidity: null}});
        const noMeasurement = makeVHumidity({capabilities: {measure_humidity: null}});
        expect(calculator().calculateFanSwitching(noTarget, makeZone('root')).getRequests()).toEqual([]);
        expect(calculator().calculateFanSwitching(noMeasurement, makeZone('root')).getRequests()).toEqual([]);
    });

    it('selects fans from the enabled same-zone and direct-child scopes only', () => {
        const child = makeZone('child', 'root');
        const root = makeZone('root', undefined, [child]);
        const rootFan = makeDevice({id: 'root-fan', zone: 'root', deviceClass: DeviceClass.fan});
        const childFan = makeDevice({id: 'child-fan', zone: 'child', deviceClass: DeviceClass.fan});
        const calculator = new VHumidityDeviceCalculator(new Zones(), makeDevicesStub([rootFan, childFan]));
        expect(
            calculator
                .getFans(root, new Zones(), {zone: {clazz: false}, sub_zones: {clazz: true}})
                .map(device => device.id),
        ).toEqual(['child-fan']);
    });
});
