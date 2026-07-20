import {describe, expect, it, vi} from 'vitest';
import {VThermoDeviceCalculator} from '../lib/VThermoDeviceCalculator';
import {DeviceMapper} from '../lib/DeviceMapper';
import {Zones} from '../lib/Zones';
import {CalcMethod, CAPABILITY_ACTIVE, DeviceCapability, DeviceClass, TemperatureSettingsZone} from '../lib/types';
import {makeApiDevice, makeDevice, makeDevicesStub, makeVThermo, makeZone, NOW} from './helpers';

describe('VThermoDeviceCalculator temperature inputs', () => {
    it('selects enabled sensor categories and excludes the controlling virtual thermostat', () => {
        const root = makeZone('root');
        const sensor = makeDevice({id: 'sensor', capabilities: {measure_temperature: 10}});
        const thermostat = makeDevice({
            id: 'thermostat',
            deviceClass: DeviceClass.thermostat,
            capabilities: {measure_temperature: 20},
        });
        const virtual = makeVThermo({capabilities: {measure_temperature: 30}});
        const other = makeDevice({id: 'other', deviceClass: 'speaker', capabilities: {measure_temperature: 40}});
        const calculator = new VThermoDeviceCalculator(
            new Zones(),
            makeDevicesStub([sensor, thermostat, virtual, other]),
        );
        const settings = Object.assign(new TemperatureSettingsZone(), {
            sensor: true,
            thermostat: true,
            vthermo: false,
            other: true,
        });
        expect(calculator.getTemperaturesInZone(root, settings).map(value => value.value)).toEqual([10, 20, 40]);
    });

    it('does not duplicate readings when several zones are selected', () => {
        const zones = [makeZone('one'), makeZone('two')];
        const calculator = new VThermoDeviceCalculator(
            new Zones(),
            makeDevicesStub([
                makeDevice({id: 'one', zone: 'one', capabilities: {measure_temperature: 10}}),
                makeDevice({id: 'two', zone: 'two', capabilities: {measure_temperature: 20}}),
            ]),
        );
        expect(calculator.getTemperaturesInZone(zones, {sensor: true}).map(value => value.value)).toEqual([10, 20]);
        expect(calculator.getTemperaturesInZone([], {sensor: true})).toEqual([]);
        expect(calculator.getTemperaturesInZone(undefined, {sensor: true})).toEqual([]);
    });

    it('combines current, parent and direct-child sensor scopes', () => {
        const child = makeZone('child', 'root');
        const root = makeZone('root', 'parent', [child]);
        const parent = makeZone('parent', undefined, [root]);
        const zones = new Zones({
            parent: {id: 'parent', name: 'Parent', parent: null},
            root: {id: 'root', name: 'Root', parent: 'parent'},
            child: {id: 'child', name: 'Child', parent: 'root'},
        } as any);
        const calculator = new VThermoDeviceCalculator(
            zones,
            makeDevicesStub([
                makeDevice({id: 'parent-sensor', zone: parent.id, capabilities: {measure_temperature: 10}}),
                makeDevice({id: 'root-sensor', zone: root.id, capabilities: {measure_temperature: 20}}),
                makeDevice({id: 'child-sensor', zone: child.id, capabilities: {measure_temperature: 30}}),
            ]),
        );
        expect(
            calculator
                .getTemperatures(root, zones, {
                    calcMethod: CalcMethod.AVERAGE,
                    zone: {sensor: true},
                    parent: {sensor: true},
                    children: {sensor: true},
                })
                .map(value => value.value),
        ).toEqual([20, 10, 30]);
    });

    it('does not overwrite a manual temperature', () => {
        const device = makeVThermo({temperatureSettings: {calcMethod: CalcMethod.MANUAL}});
        const calculator = new VThermoDeviceCalculator(new Zones(), makeDevicesStub([]));
        expect(calculator.calculateMeasureTemperature(device, makeZone('root'))).toBeUndefined();
    });

    it('averages valid readings and includes validation boundaries', () => {
        const device = makeVThermo({
            capabilities: {measure_temperature: 0},
            temperatureSettings: {
                calcMethod: CalcMethod.AVERAGE,
                validate: true,
                validate_min: 10,
                validate_max: 30,
                zone: {sensor: true},
            },
        });
        const calculator = new VThermoDeviceCalculator(
            new Zones(),
            makeDevicesStub([
                makeDevice({id: 'low', capabilities: {measure_temperature: 9}}),
                makeDevice({id: 'min', capabilities: {measure_temperature: 10}}),
                makeDevice({id: 'max', capabilities: {measure_temperature: 30}}),
                makeDevice({id: 'high', capabilities: {measure_temperature: 31}}),
            ]),
        );
        expect(calculator.calculateMeasureTemperature(device, makeZone('root'))).toMatchObject({
            capabilityId: 'measure_temperature',
            value: 20,
        });
    });

    it('averages equivalent Celsius and Fahrenheit API readings in Celsius', () => {
        const celsius = DeviceMapper.map(makeApiDevice({id: 'celsius', capabilities: {measure_temperature: 20}}));
        const fahrenheitApi = makeApiDevice({id: 'fahrenheit', capabilities: {measure_temperature: 77}});
        fahrenheitApi.capabilitiesObj.measure_temperature.units = '°F';
        const fahrenheit = DeviceMapper.map(fahrenheitApi);
        const device = makeVThermo({
            capabilities: {measure_temperature: 0},
            temperatureSettings: {calcMethod: CalcMethod.AVERAGE, zone: {sensor: true}},
        });

        expect(
            new VThermoDeviceCalculator(
                new Zones(),
                makeDevicesStub([celsius, fahrenheit]),
            ).calculateMeasureTemperature(device, makeZone('root')),
        ).toMatchObject({value: 22.5});
    });

    it('returns null when no automatic reading is available', () => {
        const device = makeVThermo({
            capabilities: {measure_temperature: 20},
            temperatureSettings: {calcMethod: CalcMethod.AVERAGE, zone: {sensor: true}},
        });
        const request = new VThermoDeviceCalculator(new Zones(), makeDevicesStub([])).calculateMeasureTemperature(
            device,
            makeZone('root'),
        );
        expect(request).toMatchObject({value: null});
    });

    it('applies maximum-age filtering to the MAX calculation method', () => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
        const calculator = new VThermoDeviceCalculator(new Zones(), makeDevicesStub([]));
        const result = (calculator as any).calculateTemperature(
            [new DeviceCapability(99, NOW - 60_000), new DeviceCapability(20, NOW)],
            {calcMethod: CalcMethod.MAX, measurementMaxAge: 1000},
        );
        expect(result).toBe(20);
        vi.useRealTimers();
    });
});

describe('VThermoDeviceCalculator switching', () => {
    const calculator = () => new VThermoDeviceCalculator(new Zones(), makeDevicesStub([]));

    it('turns heating on below and off above the hysteresis band', () => {
        const device = makeVThermo();
        expect(calculator().resolveOnOff(device, 19.49, 20)).toBe(true);
        expect(calculator().resolveOnOff(device, 20.51, 20)).toBe(false);
    });

    it('does nothing at the hysteresis boundaries or within the band', () => {
        const device = makeVThermo();
        expect(calculator().resolveOnOff(device, 19.5, 20)).toBeUndefined();
        expect(calculator().resolveOnOff(device, 20, 20)).toBeUndefined();
        expect(calculator().resolveOnOff(device, 20.5, 20)).toBeUndefined();
    });

    it('supports zero hysteresis without changing state exactly at the target', () => {
        const device = makeVThermo({deviceSettings: {hysteresis: 0}});
        expect(calculator().resolveOnOff(device, 19.99, 20)).toBe(true);
        expect(calculator().resolveOnOff(device, 20, 20)).toBeUndefined();
        expect(calculator().resolveOnOff(device, 20.01, 20)).toBe(false);
    });

    it('uses the default hysteresis when the setting is undefined', () => {
        const device = makeVThermo({deviceSettings: {hysteresis: undefined}});
        expect(calculator().resolveOnOff(device, 19.75, 20)).toBeUndefined();
        expect(calculator().resolveOnOff(device, 19.49, 20)).toBe(true);
    });

    it('reverses threshold behavior when switching is inverted', () => {
        const device = makeVThermo({deviceSettings: {invert: true}});
        expect(calculator().resolveOnOff(device, 19, 20)).toBe(false);
        expect(calculator().resolveOnOff(device, 21, 20)).toBe(true);
    });

    it('turns active heating off when the main switch is off', () => {
        const active = makeVThermo({capabilities: {onoff: false, [CAPABILITY_ACTIVE]: true}});
        const idle = makeVThermo({capabilities: {onoff: false, [CAPABILITY_ACTIVE]: false}});
        expect(calculator().resolveOnOff(active, 10, 20)).toBe(false);
        expect(calculator().resolveOnOff(idle, 10, 20)).toBeUndefined();
    });

    it('ignores the main switch when on/off control is disabled', () => {
        const device = makeVThermo({
            capabilities: {onoff: false},
            deviceSettings: {onoffEnabled: false},
        });
        expect(calculator().resolveOnOff(device, 10, 20)).toBe(true);
    });

    it('gives contact alarms priority over motion alarms', () => {
        const device = makeVThermo({capabilities: {[CAPABILITY_ACTIVE]: true}});
        expect(calculator().resolveOnOff(device, 10, 20, true, true)).toBe(false);
        expect(calculator().resolveOnOff(device, 20, 20, false, true)).toBe(true);
    });

    it('rejects non-VThermo devices and devices without settings', () => {
        expect(
            calculator().resolveOnOff(makeDevice({capabilities: {onoff: true, [CAPABILITY_ACTIVE]: false}}), 10, 20),
        ).toBeUndefined();
        const withoutSettings = makeVThermo();
        withoutSettings.deviceSettings = undefined;
        expect(calculator().resolveOnOff(withoutSettings, 10, 20)).toBeUndefined();
    });

    it('creates virtual, heater and physical thermostat requests with triggers and delay', () => {
        const root = makeZone('root');
        const vthermo = makeVThermo({
            capabilities: {measure_temperature: 18, target_temperature: 20, [CAPABILITY_ACTIVE]: false},
            deviceSettings: {
                zone: {clazz: true, thermostats: true},
                sub_zones: {clazz: false, thermostats: false},
                deviceDelay: 250,
            },
        });
        const heater = makeDevice({id: 'heater', deviceClass: DeviceClass.heater, capabilities: {onoff: false}});
        const thermostat = makeDevice({
            id: 'physical',
            deviceClass: DeviceClass.thermostat,
            capabilities: {target_temperature: 18, measure_temperature: 20},
        });
        const requests = new VThermoDeviceCalculator(new Zones(), makeDevicesStub([vthermo, heater, thermostat]))
            .calculateHeaterSwitching(vthermo, root)
            .getRequests();
        expect(requests).toEqual([
            expect.objectContaining({
                dataId: 'vthermo-data',
                capabilityId: CAPABILITY_ACTIVE,
                value: true,
                trigger: 'vt_onoff_true',
            }),
            expect.objectContaining({id: 'heater', capabilityId: 'onoff', value: true, deviceDelay: 250}),
            expect.objectContaining({id: 'physical', capabilityId: 'target_temperature', value: 22, deviceDelay: 250}),
        ]);
    });

    it('preserves the current output without target or measured temperature', () => {
        const root = makeZone('root');
        const noTarget = makeVThermo({capabilities: {target_temperature: null}});
        const noMeasurement = makeVThermo({capabilities: {measure_temperature: null, [CAPABILITY_ACTIVE]: true}});
        expect(calculator().calculateHeaterSwitching(noTarget, root).getRequests()).toEqual([]);
        expect(calculator().calculateHeaterSwitching(noMeasurement, root).getRequests()).toEqual([]);
    });

    it('turns controlled heaters off when VThermo is switched off without a usable temperature', () => {
        const root = makeZone('root');
        const vthermo = makeVThermo({
            capabilities: {
                onoff: false,
                [CAPABILITY_ACTIVE]: false,
                target_temperature: null,
                measure_temperature: null,
            },
        });
        const heater = makeDevice({id: 'heater', deviceClass: DeviceClass.heater, capabilities: {onoff: true}});
        const requests = new VThermoDeviceCalculator(new Zones(), makeDevicesStub([vthermo, heater]))
            .calculateHeaterSwitching(vthermo, root)
            .getRequests();

        expect(requests).toEqual([expect.objectContaining({id: 'heater', capabilityId: 'onoff', value: false})]);
    });

    it('selects heaters and thermostats from independently enabled zone scopes', () => {
        const child = makeZone('child', 'root');
        const root = makeZone('root', undefined, [child]);
        const rootHeater = makeDevice({id: 'root-heater', deviceClass: DeviceClass.heater, zone: 'root'});
        const childHeater = makeDevice({id: 'child-heater', deviceClass: DeviceClass.heater, zone: 'child'});
        const rootThermostat = makeDevice({id: 'root-thermostat', deviceClass: DeviceClass.thermostat, zone: 'root'});
        const childThermostat = makeDevice({
            id: 'child-thermostat',
            deviceClass: DeviceClass.thermostat,
            zone: 'child',
        });
        const calc = new VThermoDeviceCalculator(
            new Zones(),
            makeDevicesStub([rootHeater, childHeater, rootThermostat, childThermostat]),
        );
        const settings = {zone: {clazz: true, thermostats: false}, sub_zones: {clazz: false, thermostats: true}};
        expect(calc.getHeaters(root, new Zones(), settings).map(device => device.id)).toEqual(['root-heater']);
        expect(calc.getThermostats(root, new Zones(), settings).map(device => device.id)).toEqual(['child-thermostat']);
    });
});

describe('VThermoDeviceCalculator target propagation', () => {
    it('applies offset and clamps virtual thermostat targets', () => {
        const calculator = new VThermoDeviceCalculator(new Zones(), makeDevicesStub([]));
        const recipient = makeVThermo({targetSettings: {offset: 2, min: 10, max: 25}});
        expect(calculator.calculateTargetTemperature(recipient, 20)).toBe(22);
        expect(calculator.calculateTargetTemperature(recipient, 5)).toBe(10);
        expect(calculator.calculateTargetTemperature(recipient, 30)).toBe(25);
        expect(calculator.calculateTargetTemperature(makeDevice(), 20)).toBe(20);
    });

    it('honors a zero minimum target temperature', () => {
        const recipient = makeVThermo({targetSettings: {min: 0, max: 25}});
        expect(
            new VThermoDeviceCalculator(new Zones(), makeDevicesStub([])).calculateTargetTemperature(recipient, -5),
        ).toBe(0);
    });

    it('honors zero and negative maximum target temperatures', () => {
        const calculator = new VThermoDeviceCalculator(new Zones(), makeDevicesStub([]));
        expect(calculator.calculateTargetTemperature(makeVThermo({targetSettings: {max: 0}}), 5)).toBe(0);
        expect(calculator.calculateTargetTemperature(makeVThermo({targetSettings: {min: -10, max: -1}}), 5)).toBe(-1);
        expect(calculator.calculateTargetTemperature(makeVThermo({targetSettings: {min: -10, max: -1}}), -20)).toBe(
            -10,
        );
    });

    it('does not clamp target temperatures when limits are undefined', () => {
        const recipient = makeVThermo({targetSettings: {min: undefined, max: undefined}});
        expect(
            new VThermoDeviceCalculator(new Zones(), makeDevicesStub([])).calculateTargetTemperature(recipient, -5),
        ).toBe(-5);
    });

    it('updates enabled virtual thermostats in direct children and physical thermostats in deeper descendants', () => {
        const grandchild = makeZone('grandchild', 'child');
        const child = makeZone('child', 'root', [grandchild]);
        const root = makeZone('root', undefined, [child]);
        const source = makeVThermo({
            id: 'source',
            zone: 'root',
            capabilities: {target_temperature: 22},
            targetSettings: {
                sub_zones: {to_vthermo: true},
                all_sub_zones: {to_other: true},
            },
        });
        const childVirtual = makeVThermo({
            id: 'child-virtual',
            dataId: 'child-data',
            zone: 'child',
            capabilities: {target_temperature: 20},
            targetSettings: {offset: 1, target_update_enabled: true},
        });
        const deepPhysical = makeDevice({
            id: 'deep-physical',
            driverId: 'physical-driver',
            deviceClass: DeviceClass.thermostat,
            zone: 'grandchild',
            capabilities: {target_temperature: 19},
        });
        const calculator = new VThermoDeviceCalculator(
            new Zones(),
            makeDevicesStub([source, childVirtual, deepPhysical]),
        );
        expect(calculator.calculateTargetTemperatures(source, root).getRequests()).toEqual([
            expect.objectContaining({id: 'child-virtual', value: 23}),
            expect.objectContaining({id: 'deep-physical', value: 22}),
        ]);
    });

    it('does not update virtual recipients that disabled target updates', () => {
        const child = makeZone('child', 'root');
        const root = makeZone('root', undefined, [child]);
        const source = makeVThermo({
            id: 'source',
            targetSettings: {sub_zones: {to_vthermo: true}},
            capabilities: {target_temperature: 22},
        });
        const recipient = makeVThermo({
            id: 'recipient',
            zone: 'child',
            targetSettings: {target_update_enabled: false},
            capabilities: {target_temperature: 20},
        });
        expect(
            new VThermoDeviceCalculator(new Zones(), makeDevicesStub([source, recipient]))
                .calculateTargetTemperatures(source, root)
                .getRequests(),
        ).toEqual([]);
    });
});
