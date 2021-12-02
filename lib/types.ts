import {HomeyAPI} from "athom-api";

export class Zone {
    id!: string;
    name!: string;
    parent?: string;
    children?: Zone[]
}

export enum DeviceClass {
    heater = 'heater',
    fan = 'fan',
    thermostat = 'thermostat',
    vthermo = 'vthermo',
    vhumidity = 'vhumidity',
}

export class DeviceCapability {
    value: any;
    lastUpdated: number;

    constructor(value: any, lastUpdated: number) {
        this.value = value;
        this.lastUpdated = lastUpdated;
    }
}

export class DeviceCapabilities extends Map<string, DeviceCapability> {
}

export class Device {
    id!: string;
    dataId?: string;
    name!: string;
    driverUri?: string;
    driverId?: string;
    class?: string;
    virtualClass?: string;
    zone?: string;
    ready?: boolean;
    available?: boolean;
    capabilities?: string[];
    capabilitiesObj?: DeviceCapabilities;
    temperatureSettings?: TemperatureSettings;
    deviceSettings?: DeviceSettings;
    targetSettings?: TargetSettings;
    humiditySettings?: HumiditySettings;

    isVThermo(): boolean {
        return (this.driverUri === DRIVER_URI) &&
            (this.driverId === DRIVER_VTHERMO);
    }

    isVHumidity(): boolean {
        return (this.driverUri === DRIVER_URI) &&
            (this.driverId === DRIVER_VHUMIDITY);
    }

    /**
     * Returns the capability value, or null when unknown.
     * @param capabilityId
     */
    getLocalCapabilityValue(capabilityId: string): any {
        return this.hasCapability(capabilityId) ? this.capabilitiesObj!.get(capabilityId) : null;
    }

    /**
     * Returns true if the device has a certain capability.
     * @param capabilityId
     */
    hasCapability(capabilityId: string): boolean {
        return !!this.capabilitiesObj && this.capabilitiesObj.has(capabilityId);
    }

    /**
     * Returns true if the capability has changed.
     * @param capabilityId
     * @param value
     */
    hasChangedValue(capabilityId: string, value: any): boolean {
        const dc = this.capabilitiesObj?.get(capabilityId);
        return !!dc && dc.value !== value && value !== undefined;
    }

    /**
     * Set a device's capability value.
     * @param capabilityId
     * @param value
     */
    setLocalCapabilityValue(capabilityId: string, value: any) {
        const dc = this.capabilitiesObj?.get(capabilityId);
        if (dc) {
            dc.value = value;
            dc.lastUpdated = Date.now();
        }
    }

}

export class DeviceCapabilityEvent {
    deviceId!: string;
    capId!: string;
    value: any;
}

export const capabilityIdFormat = (deviceId: string, capabilityId: string) => `${deviceId}_${capabilityId}`;

export class DeviceRequest {
    id!: string;
    dataId?: string;
    capabilityId!: string;
    value?: any;
    trigger?: string;
    deviceDelay?: number;
    debugInfo?: any;
}

export class DeviceRequests {
    requests: DeviceRequest[];

    constructor() {
        this.requests = [];
    }

    getRequests(): DeviceRequest[] {
        return this.requests;
    }

    addRequest(dr?: DeviceRequest) {
        if (dr) {
            this.requests.push(dr);
        }
    }

    addRequests(drs: DeviceRequests) {
        this.requests.push(
            ...drs.getRequests()
                .filter(dr => !!dr)
        );
    }

    findIndex(dr: DeviceRequest): number {
        return this.requests.findIndex(drx => drx.id === dr.id && drx.capabilityId === dr.capabilityId);
    }

    static unique(requests: DeviceRequests): DeviceRequests {
        const ret = new DeviceRequests();
        for (const dr of requests.getRequests()) {
            const idx = ret.findIndex(dr);
            if (idx >= 0) {
                ret.getRequests()[idx] = dr;
            } else {
                ret.addRequest(dr);
            }
        }
        return ret;
    }

}

export const DRIVER_URI = 'homey:app:no.almli.thermostat';
export const DRIVER_VTHERMO = 'VThermo';
export const DRIVER_VHUMIDITY = 'VHumidity';

export const SUPPORTED_CLASSES = [
    'fan',
    'heater',
    'sensor',
    'socket',
    'thermostat'
];

export const CAPABILITY_ACTIVE = 'vt_onoff';

export const SUPPORTED_CAPABILITIES = [
    'onoff',
    'measure_temperature',
    'measure_humidity',
    'target_temperature',
    'thermostat_mode',
    'alarm_contact',
    'alarm_motion',
    CAPABILITY_ACTIVE,
    'vh_target_humidity'
];

export const SUPPORTED_UPDATE_CAPABILITIES = [
    'onoff',
    'target_temperature'
];

export enum CalcMethod {
    AVERAGE = 'AVERAGE',
    MIN = 'MIN',
    MAX = 'MAX',
    NEWEST = 'NEWEST',
    MANUAL = 'MANUAL'
}

export class TemperatureSettingsZone {
    sensor?: boolean;
    thermostat?: boolean;
    vthermo?: boolean;
    other?: boolean;
}

export class TemperatureSettings {
    calcMethod?: CalcMethod;
    validate?: boolean;
    validate_min?: number;
    validate_max?: number;
    zone?: TemperatureSettingsZone;
    parent?: TemperatureSettingsZone;
    children?: TemperatureSettingsZone;
}

export class DeviceSettingssZone {
    clazz?: boolean;
    thermostats?: boolean;
}

export class DeviceSettings {
    zone?: DeviceSettingssZone;
    sub_zones?: DeviceSettingssZone;
    contactAlarm?: boolean;
    motionAlarm?: boolean;
    hysteresis?: number;
    invert?: boolean;
    onoffEnabled?: boolean;
    deviceDelay?: number;
}

export class TargetSettingsZone {
    from_other?: boolean;
    to_vthermo?: boolean;
    to_other?: boolean;
}

export class TargetSettings {
    offset?: number;
    min?: number;
    max?: number;
    target_update_enabled?: boolean;
    zone?: TargetSettingsZone;
    sub_zones?: TargetSettingsZone;
    all_sub_zones?: TargetSettingsZone;
}

export enum CalcMethodHumidity {
    AVERAGE = 'AVERAGE',
    MIN = 'MIN',
    MAX = 'MAX',
    NEWEST = 'NEWEST',
}

export class HumiditySettings {
    calcMethod?: CalcMethodHumidity;
}