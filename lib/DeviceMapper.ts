// @ts-nocheck

import {HomeyAPIV3Local} from "homey-api";
import {
    Device,
    DeviceCapabilities,
    DeviceCapability,
    SUPPORTED_CAPABILITIES,
} from "./types";
import {TemperatureSettingsMapper} from "./TemperatureSettingsMapper";
import {TargetSettingsMapper} from "./TargetSettingsMapper";
import {DeviceSettingsMapper} from "./DeviceSettingsMapper";
import {HumiditySettingsMapper} from "./HumiditySettingsMapper";

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
        d.temperatureSettings = TemperatureSettingsMapper.map(i.driverId, i.settings);
        d.deviceSettings = DeviceSettingsMapper.map(i.driverId, i.settings);
        d.targetSettings = TargetSettingsMapper.map(i.driverId, i.settings);
        d.humiditySettings = HumiditySettingsMapper.map(i.driverId, i.settings);
        return d;
    }

    private static mapCapabilities(caps: any): DeviceCapabilities {
        const capabilities = new DeviceCapabilities();
        for (const key in caps) {
            if (caps.hasOwnProperty(key) && SUPPORTED_CAPABILITIES.includes(key)) {
                const values = caps[key];
                const dc = new DeviceCapability(values['value'], new Date(values['lastUpdated']).getTime());
                capabilities.set(key, dc);
            }
        }
        return capabilities;
    }

}