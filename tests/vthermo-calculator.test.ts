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

    it('selects coolers (air conditioners, fans, refrigerators) and sockets from enabled zone scopes', () => {
        const child = makeZone('child', 'root');
        const root = makeZone('root', undefined, [child]);
        const ac = makeDevice({id: 'ac', deviceClass: DeviceClass.airconditioner, zone: 'root'});
        const fan = makeDevice({id: 'fan', deviceClass: DeviceClass.fan, zone: 'root'});
        const fridge = makeDevice({id: 'fridge', deviceClass: DeviceClass.refrigerator, zone: 'root'});
        const socketHeater = makeDevice({id: 'socket-heater', deviceClass: DeviceClass.socket, zone: 'root'});
        const socketCooler = makeDevice({id: 'socket-cooler', deviceClass: DeviceClass.socket, zone: 'child'});
        const childAc = makeDevice({id: 'child-ac', deviceClass: DeviceClass.airconditioner, zone: 'child'});

        const calc = new VThermoDeviceCalculator(
            new Zones(),
            makeDevicesStub([ac, fan, fridge, socketHeater, socketCooler, childAc]),
        );

        const settings = {
            zone: {clazz: false, coolers: true, sockets_heaters: true, sockets_coolers: false, thermostats: false},
            sub_zones: {clazz: false, coolers: true, sockets_heaters: false, sockets_coolers: true, thermostats: false},
        };

        expect(calc.getHeaters(root, new Zones(), settings).map(d => d.id)).toEqual(['socket-heater']);
        expect(calc.getCoolers(root, new Zones(), settings).map(d => d.id)).toEqual([
            'ac',
            'fan',
            'fridge',
            'socket-cooler',
            'child-ac',
        ]);
    });

    it('handles cooling mode and generates vt_cooling requests', () => {
        const root = makeZone('root');
        const vthermo = makeVThermo({
            capabilities: {
                measure_temperature: 24,
                target_temperature: 22,
                thermostat_mode: 'cool',
                vt_cooling: false,
                [CAPABILITY_ACTIVE]: false,
            },
            deviceSettings: {
                zone: {clazz: true, coolers: true, thermostats: false},
                sub_zones: {clazz: false, coolers: false, thermostats: false},
            },
        });
        const ac = makeDevice({id: 'ac', deviceClass: DeviceClass.airconditioner, capabilities: {onoff: false}});
        const heater = makeDevice({id: 'heater', deviceClass: DeviceClass.heater, capabilities: {onoff: true}});

        const requests = new VThermoDeviceCalculator(new Zones(), makeDevicesStub([vthermo, ac, heater]))
            .calculateHeaterSwitching(vthermo, root)
            .getRequests();

        expect(requests).toContainEqual(
            expect.objectContaining({capabilityId: 'vt_cooling', value: true, trigger: 'vt_cooling_true'}),
        );
        expect(requests).toContainEqual(expect.objectContaining({id: 'ac', capabilityId: 'onoff', value: true}));
    });

    it('handles auto climate mode by activating heat below setpoint and cool above setpoint', () => {
        const root = makeZone('root');
        const calc = (temp: number, initialActive = false, initialCooling = false) => {
            const vthermo = makeVThermo({
                capabilities: {
                    measure_temperature: temp,
                    target_temperature: 20,
                    thermostat_mode: 'auto',
                    vt_cooling: initialCooling,
                    [CAPABILITY_ACTIVE]: initialActive,
                },
                deviceSettings: {
                    hysteresis: 1.0,
                    zone: {clazz: true, coolers: true, thermostats: false},
                    sub_zones: {clazz: false, coolers: false, thermostats: false},
                },
            });
            const ac = makeDevice({
                id: 'ac',
                deviceClass: DeviceClass.airconditioner,
                capabilities: {onoff: initialCooling},
            });
            const heater = makeDevice({
                id: 'heater',
                deviceClass: DeviceClass.heater,
                capabilities: {onoff: initialActive},
            });
            return new VThermoDeviceCalculator(
                new Zones(),
                makeDevicesStub([vthermo, ac, heater]),
            ).calculateHeaterSwitching(vthermo, root);
        };

        // Below 19 (target 20 - hyst 1.0) transitioning from cooling: heat ON, cool OFF
        const heatReqs = calc(18.5, false, true).getRequests();
        expect(heatReqs).toContainEqual(expect.objectContaining({capabilityId: CAPABILITY_ACTIVE, value: true}));
        expect(heatReqs).toContainEqual(expect.objectContaining({capabilityId: 'vt_cooling', value: false}));
        expect(heatReqs).toContainEqual(expect.objectContaining({id: 'heater', capabilityId: 'onoff', value: true}));
        expect(heatReqs).toContainEqual(expect.objectContaining({id: 'ac', capabilityId: 'onoff', value: false}));

        // Above 21 (target 20 + hyst 1.0) transitioning from heating: heat OFF, cool ON
        const coolReqs = calc(21.5, true, false).getRequests();
        expect(coolReqs).toContainEqual(expect.objectContaining({capabilityId: CAPABILITY_ACTIVE, value: false}));
        expect(coolReqs).toContainEqual(expect.objectContaining({capabilityId: 'vt_cooling', value: true}));
        expect(coolReqs).toContainEqual(expect.objectContaining({id: 'heater', capabilityId: 'onoff', value: false}));
        expect(coolReqs).toContainEqual(expect.objectContaining({id: 'ac', capabilityId: 'onoff', value: true}));

        // Inside deadband (20.0) with both previously active: both turn OFF
        const deadbandReqs = calc(20.0, true, true).getRequests();
        expect(deadbandReqs).toContainEqual(expect.objectContaining({capabilityId: CAPABILITY_ACTIVE, value: false}));
        expect(deadbandReqs).toContainEqual(expect.objectContaining({capabilityId: 'vt_cooling', value: false}));
    });

    it('shuts down heating and cooling in off mode', () => {
        const root = makeZone('root');
        const vthermo = makeVThermo({
            capabilities: {
                measure_temperature: 15,
                target_temperature: 20,
                thermostat_mode: 'off',
                vt_cooling: true,
                [CAPABILITY_ACTIVE]: true,
            },
            deviceSettings: {
                zone: {clazz: true, coolers: true, thermostats: false},
            },
        });
        const requests = new VThermoDeviceCalculator(new Zones(), makeDevicesStub([vthermo]))
            .calculateHeaterSwitching(vthermo, root)
            .getRequests();

        expect(requests).toContainEqual(expect.objectContaining({capabilityId: CAPABILITY_ACTIVE, value: false}));
        expect(requests).toContainEqual(expect.objectContaining({capabilityId: 'vt_cooling', value: false}));
    });

    it('prevents rapid short-cycling with min_off_duration and min_on_duration', () => {
        const root = makeZone('root');
        const vthermo = makeVThermo({
            capabilities: {measure_temperature: 18, target_temperature: 20, [CAPABILITY_ACTIVE]: false},
            deviceSettings: {
                minOffDuration: 180_000,
                minOnDuration: 60_000,
                zone: {clazz: true, coolers: false, thermostats: false},
            },
        });
        // Heater was switched OFF 30 seconds ago (within 180s min_off_duration)
        const recentHeater = makeDevice({
            id: 'recent-heater',
            deviceClass: DeviceClass.heater,
            capabilities: {onoff: false},
        });
        recentHeater.capabilitiesObj!.get('onoff')!.lastUpdated = Date.now() - 30_000;

        const oldHeater = makeDevice({
            id: 'old-heater',
            deviceClass: DeviceClass.heater,
            capabilities: {onoff: false},
        });
        oldHeater.capabilitiesObj!.get('onoff')!.lastUpdated = Date.now() - 200_000;

        const requests = new VThermoDeviceCalculator(new Zones(), makeDevicesStub([vthermo, recentHeater, oldHeater]))
            .calculateHeaterSwitching(vthermo, root)
            .getRequests();

        // oldHeater should turn ON, recentHeater should be suppressed due to anti-short-cycling
        expect(requests).toContainEqual(
            expect.objectContaining({id: 'old-heater', capabilityId: 'onoff', value: true}),
        );
        expect(requests).not.toContainEqual(expect.objectContaining({id: 'recent-heater'}));
    });

    it('honors contact_alarm_delay before turning off heating', () => {
        const root = makeZone('root');
        const vthermo = makeVThermo({
            capabilities: {measure_temperature: 18, target_temperature: 20, [CAPABILITY_ACTIVE]: true},
            deviceSettings: {
                contactAlarm: true,
                contactAlarmDelay: 30_000,
                zone: {clazz: true, coolers: false, thermostats: false},
            },
        });
        const heater = makeDevice({id: 'heater', deviceClass: DeviceClass.heater, capabilities: {onoff: true}});

        // Contact sensor opened 10 seconds ago (< 30s delay)
        const contactSensorRecent = makeDevice({
            id: 'sensor',
            deviceClass: DeviceClass.sensor,
            capabilities: {alarm_contact: true},
        });
        contactSensorRecent.capabilitiesObj!.get('alarm_contact')!.lastUpdated = Date.now() - 10_000;

        const reqsRecent = new VThermoDeviceCalculator(
            new Zones(),
            makeDevicesStub([vthermo, heater, contactSensorRecent]),
        )
            .calculateHeaterSwitching(vthermo, root)
            .getRequests();

        // Heating should remain ON because delay has not elapsed
        expect(reqsRecent).not.toContainEqual(expect.objectContaining({capabilityId: CAPABILITY_ACTIVE, value: false}));

        // Contact sensor opened 40 seconds ago (>= 30s delay)
        const contactSensorOld = makeDevice({
            id: 'sensor-old',
            deviceClass: DeviceClass.sensor,
            capabilities: {alarm_contact: true},
        });
        contactSensorOld.capabilitiesObj!.get('alarm_contact')!.lastUpdated = Date.now() - 40_000;

        const reqsOld = new VThermoDeviceCalculator(new Zones(), makeDevicesStub([vthermo, heater, contactSensorOld]))
            .calculateHeaterSwitching(vthermo, root)
            .getRequests();

        // Heating turns OFF after delay elapsed
        expect(reqsOld).toContainEqual(expect.objectContaining({capabilityId: CAPABILITY_ACTIVE, value: false}));
    });

    it('applies thermostat_preset offsets and away temperature correctly', () => {
        const root = makeZone('root');
        const makePresetCalc = (preset: string, temp: number) => {
            const vthermo = makeVThermo({
                capabilities: {
                    measure_temperature: temp,
                    target_temperature: 20,
                    vt_thermostat_preset: preset,
                    thermostat_mode: 'heat',
                    [CAPABILITY_ACTIVE]: false,
                },
                deviceSettings: {
                    presetEcoOffset: -2.0,
                    presetAwayTemp: 12.0,
                    presetBoostOffset: 2.0,
                    hysteresis: 0.5,
                    zone: {clazz: true, coolers: false, thermostats: false},
                },
            });
            const heater = makeDevice({id: 'heater', deviceClass: DeviceClass.heater, capabilities: {onoff: false}});
            return new VThermoDeviceCalculator(
                new Zones(),
                makeDevicesStub([vthermo, heater]),
            ).calculateHeaterSwitching(vthermo, root);
        };

        // Comfort (target 20): at 19.0 (below 19.5), heat turns ON
        expect(makePresetCalc('comfort', 19.0).getRequests()).toContainEqual(
            expect.objectContaining({capabilityId: CAPABILITY_ACTIVE, value: true}),
        );

        // Eco (target 20 - 2 = 18): at 19.0 (above 17.5), heat stays OFF
        expect(makePresetCalc('eco', 19.0).getRequests()).not.toContainEqual(
            expect.objectContaining({capabilityId: CAPABILITY_ACTIVE, value: true}),
        );

        // Away (target fixed 12.0): at 13.0, heat stays OFF; at 11.0 (below 11.5), heat turns ON
        expect(makePresetCalc('away', 13.0).getRequests()).not.toContainEqual(
            expect.objectContaining({capabilityId: CAPABILITY_ACTIVE, value: true}),
        );
        expect(makePresetCalc('away', 11.0).getRequests()).toContainEqual(
            expect.objectContaining({capabilityId: CAPABILITY_ACTIVE, value: true}),
        );
    });

    it('supports heating and cooling in auto mode with single setpoint and deadband', () => {
        const root = makeZone('root');
        const calcAuto = (temp: number) => {
            const vthermo = makeVThermo({
                capabilities: {
                    measure_temperature: temp,
                    target_temperature: 21.0,
                    thermostat_mode: 'auto',
                    vt_cooling: false,
                    [CAPABILITY_ACTIVE]: false,
                },
                deviceSettings: {
                    hysteresis: 0.5,
                    zone: {clazz: true, coolers: true, thermostats: false},
                },
            });
            const heater = makeDevice({id: 'heater', deviceClass: DeviceClass.heater, capabilities: {onoff: false}});
            const ac = makeDevice({id: 'ac', deviceClass: DeviceClass.airconditioner, capabilities: {onoff: false}});
            return new VThermoDeviceCalculator(
                new Zones(),
                makeDevicesStub([vthermo, heater, ac]),
            ).calculateHeaterSwitching(vthermo, root);
        };

        // At 20.0 (below target 21.0 - 0.5): heat ON, cool OFF
        const heatReqs = calcAuto(20.0).getRequests();
        expect(heatReqs).toContainEqual(expect.objectContaining({id: 'heater', capabilityId: 'onoff', value: true}));
        expect(heatReqs).not.toContainEqual(expect.objectContaining({id: 'ac', capabilityId: 'onoff', value: true}));

        // At 21.0 (between 20.5 and 21.5): deadband, neither heat nor cool is ON
        const midReqs = calcAuto(21.0).getRequests();
        expect(midReqs).not.toContainEqual(expect.objectContaining({id: 'heater', capabilityId: 'onoff', value: true}));
        expect(midReqs).not.toContainEqual(expect.objectContaining({id: 'ac', capabilityId: 'onoff', value: true}));

        // At 22.0 (above target 21.0 + 0.5): cool ON, heat OFF
        const coolReqs = calcAuto(22.0).getRequests();
        expect(coolReqs).toContainEqual(expect.objectContaining({id: 'ac', capabilityId: 'onoff', value: true}));
        expect(coolReqs).not.toContainEqual(
            expect.objectContaining({id: 'heater', capabilityId: 'onoff', value: true}),
        );
    });

    it('shuts down heating and cooling safely when fail-safe is enabled and temperature is missing', () => {
        const root = makeZone('root');
        const vthermo = makeVThermo({
            capabilities: {
                measure_temperature: null as any,
                target_temperature: 20,
                [CAPABILITY_ACTIVE]: true,
                vt_cooling: true,
            },
            deviceSettings: {
                failsafeEnabled: true,
                zone: {clazz: true, coolers: true, thermostats: false},
            },
        });
        const requests = new VThermoDeviceCalculator(new Zones(), makeDevicesStub([vthermo]))
            .calculateHeaterSwitching(vthermo, root)
            .getRequests();

        expect(requests).toContainEqual(expect.objectContaining({capabilityId: CAPABILITY_ACTIVE, value: false}));
        expect(requests).toContainEqual(expect.objectContaining({capabilityId: 'vt_cooling', value: false}));
    });

    it('triggers frost and overheat safety alarms and cuts off heating on overheat', () => {
        const root = makeZone('root');
        const calcSafety = (temp: number) => {
            const vthermo = makeVThermo({
                capabilities: {
                    measure_temperature: temp,
                    target_temperature: 20,
                    [CAPABILITY_ACTIVE]: true,
                },
                deviceSettings: {
                    frostAlarmTemp: 5.0,
                    overheatAlarmTemp: 40.0,
                    zone: {clazz: true, coolers: false, thermostats: false},
                },
            });
            const heater = makeDevice({id: 'heater', deviceClass: DeviceClass.heater, capabilities: {onoff: true}});
            return new VThermoDeviceCalculator(
                new Zones(),
                makeDevicesStub([vthermo, heater]),
            ).calculateHeaterSwitching(vthermo, root);
        };

        // Frost alarm at 4°C (< 5°C limit)
        const frostReqs = calcSafety(4.0).getRequests();
        expect(frostReqs).toContainEqual(expect.objectContaining({trigger: 'vt_frost_alarm_true'}));

        // Overheat alarm at 42°C (> 40°C limit): triggers overheat alarm and cuts off heating
        const overheatReqs = calcSafety(42.0).getRequests();
        expect(overheatReqs).toContainEqual(expect.objectContaining({trigger: 'vt_overheat_alarm_true'}));
        expect(overheatReqs).toContainEqual(expect.objectContaining({capabilityId: CAPABILITY_ACTIVE, value: false}));
    });

    it('suppresses cooling when condensation protection detects room temp near dew point', () => {
        const root = makeZone('root');
        const vthermo = makeVThermo({
            capabilities: {
                measure_temperature: 24.0,
                target_temperature: 20.0,
                thermostat_mode: 'cool',
                vt_cooling: true,
            },
            deviceSettings: {
                condensationProtection: true,
                zone: {clazz: false, coolers: true, thermostats: false},
            },
        });
        // Humidity is 95% at 24°C -> Dew point is ~23.1°C (within 1°C of 24°C)
        const humiditySensor = makeDevice({
            id: 'hum-sensor',
            deviceClass: DeviceClass.sensor,
            zone: 'root',
            capabilities: {measure_humidity: 95},
        });
        const ac = makeDevice({id: 'ac', deviceClass: DeviceClass.airconditioner, capabilities: {onoff: true}});

        const requests = new VThermoDeviceCalculator(new Zones(), makeDevicesStub([vthermo, humiditySensor, ac]))
            .calculateHeaterSwitching(vthermo, root)
            .getRequests();

        // Cooling should be shut off to prevent condensation
        expect(requests).toContainEqual(expect.objectContaining({capabilityId: 'vt_cooling', value: false}));
        expect(requests).toContainEqual(
            expect.objectContaining({capabilityId: 'vt_dew_point', value: 23.15, trigger: 'vt_dew_point_changed'}),
        );
        expect(requests).toContainEqual(expect.objectContaining({capabilityId: 'vt_condensation_alarm', value: true}));
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
