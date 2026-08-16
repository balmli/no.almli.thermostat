export class Zone {
    id!: string;
    name!: string;
    parent?: string;
    children?: Zone[];
}

export enum DeviceClass {
    airconditioner = 'airconditioner',
    heater = 'heater',
    fan = 'fan',
    refrigerator = 'refrigerator',
    sensor = 'sensor',
    socket = 'socket',
    thermostat = 'thermostat',
    vthermo = 'vthermo',
    vhumidity = 'vhumidity',
}

export enum ThermostatMode {
    AUTO = 'auto',
    HEAT = 'heat',
    COOL = 'cool',
    OFF = 'off',
}

export enum ThermostatPreset {
    COMFORT = 'comfort',
    ECO = 'eco',
    AWAY = 'away',
    BOOST = 'boost',
}

export class DeviceCapability {
    value: any;
    lastUpdated: number;
    units?: string | null;

    constructor(value: any, lastUpdated: number, units?: string | null) {
        this.value = value;
        this.lastUpdated = lastUpdated;
        this.units = units;
    }
}

export class DeviceCapabilities extends Map<string, DeviceCapability> {}

export class Device {
    id!: string;
    dataId?: string;
    name!: string;
    driverId?: string;
    class?: string;
    virtualClass?: string | null;
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
        return this.driverId === DRIVER_VTHERMO;
    }

    isVHumidity(): boolean {
        return this.driverId === DRIVER_VHUMIDITY;
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
        this.requests.push(...drs.getRequests().filter(dr => !!dr));
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

export const DRIVER_VTHERMO = 'homey:app:no.almli.thermostat:VThermo';
export const DRIVER_VHUMIDITY = 'homey:app:no.almli.thermostat:VHumidity';

export const SUPPORTED_CLASSES = ['airconditioner', 'fan', 'heater', 'refrigerator', 'sensor', 'socket', 'thermostat'];

export const CAPABILITY_ACTIVE = 'vt_onoff';
export const CAPABILITY_COOLING = 'vt_cooling';
export const CAPABILITY_PRESET = 'vt_thermostat_preset';
export const CAPABILITY_DEW_POINT = 'vt_dew_point';
export const CAPABILITY_CONDENSATION_ALARM = 'vt_condensation_alarm';

export const SUPPORTED_CAPABILITIES = [
    'onoff',
    'measure_temperature',
    'measure_humidity',
    'target_temperature',
    'thermostat_mode',
    CAPABILITY_PRESET,
    CAPABILITY_DEW_POINT,
    CAPABILITY_CONDENSATION_ALARM,
    'alarm_contact',
    'alarm_motion',
    CAPABILITY_ACTIVE,
    CAPABILITY_COOLING,
    'vh_target_humidity',
];

export const SUPPORTED_UPDATE_CAPABILITIES = [
    'onoff',
    'measure_temperature',
    'target_temperature',
    CAPABILITY_ACTIVE,
    CAPABILITY_COOLING,
    CAPABILITY_DEW_POINT,
    CAPABILITY_CONDENSATION_ALARM,
    'vh_target_humidity',
    'vh_target_humidity_view',
];

export enum CalcMethod {
    AVERAGE = 'AVERAGE',
    MIN = 'MIN',
    MAX = 'MAX',
    NEWEST = 'NEWEST',
    MANUAL = 'MANUAL',
}

export class TemperatureSettingsZone {
    sensor?: boolean;
    thermostat?: boolean;
    vthermo?: boolean;
    other?: boolean;
}

export class TemperatureSettings {
    calcMethod?: CalcMethod;
    measurementMaxAge?: number; // in millis
    validate?: boolean;
    validate_min?: number;
    validate_max?: number;
    zone?: TemperatureSettingsZone;
    parent?: TemperatureSettingsZone;
    children?: TemperatureSettingsZone;
}

export class DeviceSettingssZone {
    clazz?: boolean;
    coolers?: boolean;
    sockets_heaters?: boolean;
    sockets_coolers?: boolean;
    thermostats?: boolean;
}

export class DeviceSettings {
    zone?: DeviceSettingssZone;
    sub_zones?: DeviceSettingssZone;
    contactAlarm?: boolean;
    contactAlarmDelay?: number; // in millis
    motionAlarm?: boolean;
    hysteresis?: number;
    invert?: boolean;
    onoffEnabled?: boolean;
    deviceDelay?: number;
    minOffDuration?: number; // in millis
    minOnDuration?: number; // in millis
    presetEcoOffset?: number;
    presetAwayTemp?: number;
    presetBoostOffset?: number;
    failsafeEnabled?: boolean;
    frostAlarmTemp?: number;
    overheatAlarmTemp?: number;
    condensationProtection?: boolean;
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
    measurementMaxAge?: number; // in millis
}
