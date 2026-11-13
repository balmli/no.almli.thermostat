// @ts-nocheck

import {HomeyAPIV3Local} from 'homey-api';
import {Device, DeviceCapabilities, DeviceCapability, SUPPORTED_CAPABILITIES} from './types';
import {TemperatureSettingsMapper} from './TemperatureSettingsMapper';
import {TargetSettingsMapper} from './TargetSettingsMapper';
import {DeviceSettingsMapper} from './DeviceSettingsMapper';
import {HumiditySettingsMapper} from './HumiditySettingsMapper';
import {toCanonicalTemperature} from './TemperatureUnits';

export class DeviceMapper {
    static map(i: HomeyAPIV3Local.ManagerDevices.Device): Device {
        const d = new Device();
        d.id = i.id;
        d.dataId = i.data ? i.data.id : undefined;
        d.name = i.name;
        d.driverId = i.driverId;
        d.class = i.class;
        d.virtualClass = i.virtualClass;
        d.zone = i.zone;
        d.ready = i.ready;
        d.available = i.available;
        d.capabilities = i.capabilities;
        d.capabilitiesObj = DeviceMapper.mapCapabilities(i.capabilitiesObj);
        DeviceMapper.mapSettings(d, i.driverId, i.settings);
        return d;
    }

    static mapSettings(device: Device, driverId?: string, settings?: any): void {
        device.temperatureSettings = TemperatureSettingsMapper.map(driverId, settings);
        device.deviceSettings = DeviceSettingsMapper.map(driverId, settings);
        device.targetSettings = TargetSettingsMapper.map(driverId, settings);
        device.humiditySettings = HumiditySettingsMapper.map(driverId, settings);
    }

    private static mapCapabilities(caps: any): DeviceCapabilities {
        const capabilities = new DeviceCapabilities();
        for (const key in caps) {
            if (caps.hasOwnProperty(key) && SUPPORTED_CAPABILITIES.includes(key)) {
                const values = caps[key];
                if (key === 'measure_power' && !values) {
                    capabilities.set(key, new DeviceCapability(null, NaN));
                    continue;
                }
                const units = values['units'];
                const value = toCanonicalTemperature(key, values['value'], units);
                const stamp = values['lastUpdated'];
                const lastUpdated =
                    key === 'measure_power' &&
                    !(stamp instanceof Date || typeof stamp === 'string' || typeof stamp === 'number')
                        ? NaN
                        : new Date(stamp).getTime();
                const dc = new DeviceCapability(value, lastUpdated, units);
                capabilities.set(key, dc);
            }
        }
        return capabilities;
    }
}
