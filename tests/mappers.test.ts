import {describe, expect, it} from 'vitest';
import {DeviceMapper} from '../lib/DeviceMapper';
import {DeviceSettingsMapper} from '../lib/DeviceSettingsMapper';
import {HumiditySettingsMapper} from '../lib/HumiditySettingsMapper';
import {TargetSettingsMapper} from '../lib/TargetSettingsMapper';
import {TemperatureSettingsMapper} from '../lib/TemperatureSettingsMapper';
import {CalcMethod, CalcMethodHumidity, DRIVER_VHUMIDITY, DRIVER_VTHERMO} from '../lib/types';
import {makeApiDevice, NOW} from './helpers';

describe('settings mappers', () => {
    it('maps thermostat sensor scopes, validation and seconds to milliseconds', () => {
        const mapped = TemperatureSettingsMapper.map(DRIVER_VTHERMO, {
            calc_method: CalcMethod.AVERAGE,
            ignore_old_measurements: 120,
            validate_temperature: true,
            validate_min_temp: -10,
            validate_max_temp: 50,
            zone_sensors: true,
            thermostat: true,
            zone_other: false,
            parent_sensors: true,
            parent_thermostat: false,
            parent_vthermo: true,
            parent_other: false,
            sub_sensors: false,
            sub_thermostat: true,
            sub_vthermo: true,
            sub_other: true,
        });
        expect(mapped).toMatchObject({
            calcMethod: CalcMethod.AVERAGE,
            measurementMaxAge: 120_000,
            validate: true,
            validate_min: -10,
            validate_max: 50,
            zone: {sensor: true, thermostat: true, vthermo: false, other: false},
            parent: {sensor: true, thermostat: false, vthermo: true, other: false},
            children: {sensor: false, thermostat: true, vthermo: true, other: true},
        });
    });

    it('does not map temperature settings for other drivers or absent settings', () => {
        expect(TemperatureSettingsMapper.map(DRIVER_VHUMIDITY, {})).toBeUndefined();
        expect(TemperatureSettingsMapper.map(DRIVER_VTHERMO)).toBeUndefined();
    });

    it('maps humidity settings and leaves zero max age disabled', () => {
        expect(
            HumiditySettingsMapper.map(DRIVER_VHUMIDITY, {
                calc_method_humidity: CalcMethodHumidity.MAX,
                ignore_old_measurements: 30,
            }),
        ).toMatchObject({calcMethod: CalcMethodHumidity.MAX, measurementMaxAge: 30_000});
        expect(
            HumiditySettingsMapper.map(DRIVER_VHUMIDITY, {
                calc_method_humidity: CalcMethodHumidity.NEWEST,
                ignore_old_measurements: 0,
            })?.measurementMaxAge,
        ).toBeUndefined();
    });

    it('maps thermostat control settings for same and direct-child zones', () => {
        expect(
            DeviceSettingsMapper.map(DRIVER_VTHERMO, {
                devices_zone_heaters: true,
                devices_zone_thermostats: false,
                devices_sub_zones_heaters: false,
                devices_sub_zones_thermostats: true,
                contact_alarm: true,
                motion_alarm: false,
                hysteresis: 0.25,
                invert: true,
                onoff_enabled: true,
                device_delay: 500,
            }),
        ).toEqual({
            zone: {clazz: true, thermostats: false},
            sub_zones: {clazz: false, thermostats: true},
            contactAlarm: true,
            motionAlarm: false,
            hysteresis: 0.25,
            invert: true,
            onoffEnabled: true,
            deviceDelay: 500,
        });
    });

    it('always enables same-zone fan control for virtual humidity devices', () => {
        expect(DeviceSettingsMapper.map(DRIVER_VHUMIDITY, {})?.zone).toEqual({clazz: true});
    });

    it('prevents conflicting same-zone target input and output modes', () => {
        expect(
            TargetSettingsMapper.map(DRIVER_VTHERMO, {
                target_diff_temp: 1,
                target_min_temp: 5,
                target_max_temp: 30,
                target_update_enabled: true,
                target_zone_from_other: true,
                target_zone_to_other: true,
                devices_zone_thermostats: false,
                target_sub_zones_to_vthermo: true,
                target_sub_zones_to_other: false,
                target_all_sub_zones_to_vthermo: false,
                target_all_sub_zones_to_other: true,
            }),
        ).toMatchObject({
            offset: 1,
            min: 5,
            max: 30,
            target_update_enabled: true,
            zone: {from_other: true, to_other: false},
            sub_zones: {to_vthermo: true, to_other: false},
            all_sub_zones: {to_vthermo: false, to_other: true},
        });
    });
});

describe('DeviceMapper', () => {
    it('maps identity, supported capabilities and timestamps', () => {
        const apiDevice = makeApiDevice({
            id: 'sensor-1',
            dataId: 'data-1',
            name: 'Sensor',
            deviceClass: 'sensor',
            capabilities: {measure_temperature: 21.5, unsupported_capability: 99},
        });
        apiDevice.capabilitiesObj.measure_temperature.lastUpdated = new Date(NOW).toISOString();
        const mapped = DeviceMapper.map(apiDevice);
        expect(mapped).toMatchObject({id: 'sensor-1', dataId: 'data-1', name: 'Sensor', class: 'sensor'});
        expect(mapped.capabilitiesObj?.get('measure_temperature')).toMatchObject({value: 21.5, lastUpdated: NOW});
        expect(mapped.capabilitiesObj?.has('unsupported_capability')).toBe(false);
    });

    it('attaches all applicable virtual thermostat settings', () => {
        const apiDevice = makeApiDevice({driverId: DRIVER_VTHERMO, capabilities: {target_temperature: 20}});
        apiDevice.settings = {calc_method: CalcMethod.MANUAL, devices_zone_heaters: true};
        const mapped = DeviceMapper.map(apiDevice);
        expect(mapped.temperatureSettings?.calcMethod).toBe(CalcMethod.MANUAL);
        expect(mapped.deviceSettings?.zone?.clazz).toBe(true);
        expect(mapped.targetSettings).toBeDefined();
        expect(mapped.humiditySettings).toBeUndefined();
    });
});
