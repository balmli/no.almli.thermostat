import {
    CAPABILITY_ACTIVE,
    Device,
    DeviceCapabilities,
    DeviceCapability,
    DeviceClass,
    DeviceSettings,
    DRIVER_VHUMIDITY,
    DRIVER_VTHERMO,
    HumiditySettings,
    TargetSettings,
    TemperatureSettings,
    Zone,
} from '../lib/types';
import {Devices} from '../lib/Devices';

export const NOW = new Date('2026-01-01T12:00:00.000Z').getTime();

export function makeZone(id: string, parent?: string, children: Zone[] = []): Zone {
    return {id, name: id, parent, children};
}

type DeviceOptions = {
    id?: string;
    dataId?: string;
    name?: string;
    driverId?: string;
    deviceClass?: string;
    virtualClass?: string | null;
    zone?: string;
    capabilities?: Record<string, unknown | DeviceCapability>;
    deviceSettings?: DeviceSettings;
    temperatureSettings?: TemperatureSettings;
    targetSettings?: TargetSettings;
    humiditySettings?: HumiditySettings;
};

export function makeDevice(options: DeviceOptions = {}): Device {
    const device = new Device();
    device.id = options.id ?? 'device';
    device.dataId = options.dataId;
    device.name = options.name ?? device.id;
    device.driverId = options.driverId;
    device.class = options.deviceClass ?? 'sensor';
    device.virtualClass = options.virtualClass;
    device.zone = options.zone ?? 'root';
    device.ready = true;
    device.available = true;
    device.capabilitiesObj = new DeviceCapabilities();

    for (const [id, value] of Object.entries(options.capabilities ?? {})) {
        device.capabilitiesObj.set(id, value instanceof DeviceCapability ? value : new DeviceCapability(value, NOW));
    }
    device.capabilities = [...device.capabilitiesObj.keys()];
    device.deviceSettings = options.deviceSettings;
    device.temperatureSettings = options.temperatureSettings;
    device.targetSettings = options.targetSettings;
    device.humiditySettings = options.humiditySettings;
    return device;
}

export function makeVThermo(options: DeviceOptions = {}): Device {
    return makeDevice({
        id: 'vthermo',
        dataId: 'vthermo-data',
        driverId: DRIVER_VTHERMO,
        deviceClass: DeviceClass.thermostat,
        ...options,
        capabilities: {
            onoff: true,
            [CAPABILITY_ACTIVE]: false,
            target_temperature: 20,
            measure_temperature: 20,
            ...options.capabilities,
        },
        deviceSettings: {
            onoffEnabled: true,
            hysteresis: 0.5,
            zone: {clazz: true, thermostats: false},
            sub_zones: {clazz: false, thermostats: false},
            ...options.deviceSettings,
        },
    });
}

export function makeVHumidity(options: DeviceOptions = {}): Device {
    return makeDevice({
        id: 'vhumidity',
        dataId: 'vhumidity-data',
        driverId: DRIVER_VHUMIDITY,
        deviceClass: DeviceClass.thermostat,
        ...options,
        capabilities: {
            onoff: true,
            [CAPABILITY_ACTIVE]: false,
            vh_target_humidity: 50,
            measure_humidity: 50,
            ...options.capabilities,
        },
        deviceSettings: {
            onoffEnabled: true,
            hysteresis: 1,
            zone: {clazz: true},
            sub_zones: {clazz: false},
            ...options.deviceSettings,
        },
    });
}

export function makeApiDevice(options: DeviceOptions = {}): any {
    const device = makeDevice(options);
    const capabilitiesObj = Object.fromEntries(
        [...(device.capabilitiesObj?.entries() ?? [])].map(([id, capability]) => [
            id,
            {value: capability.value, lastUpdated: new Date(capability.lastUpdated).toISOString()},
        ]),
    );
    return {
        id: device.id,
        name: device.name,
        data: device.dataId ? {id: device.dataId} : undefined,
        driverId: device.driverId,
        class: device.class,
        virtualClass: device.virtualClass,
        zone: device.zone,
        ready: true,
        available: true,
        capabilities: Object.keys(capabilitiesObj),
        capabilitiesObj,
        settings: {},
    };
}

export function makeDevicesStub(devices: Device[]): Devices {
    const inZones = (zones: Zone | Zone[] | undefined) => {
        if (!zones) return [];
        const ids = (Array.isArray(zones) ? zones : [zones]).map(zone => zone.id);
        return devices.filter(device => !!device.zone && ids.includes(device.zone));
    };
    const matchesClass = (device: Device, deviceClass?: DeviceClass) => {
        if (!deviceClass) return true;
        if (deviceClass === DeviceClass.vthermo) return device.isVThermo();
        if (deviceClass === DeviceClass.vhumidity) return device.isVHumidity();
        return (
            !device.isVThermo() &&
            !device.isVHumidity() &&
            (device.class === deviceClass || device.virtualClass === deviceClass)
        );
    };
    return {
        getDevices: (deviceClass?: DeviceClass) => devices.filter(device => matchesClass(device, deviceClass)),
        getDevicesFromZones: (zones: Zone | Zone[] | undefined, deviceClass?: DeviceClass) =>
            inZones(zones).filter(device => matchesClass(device, deviceClass)),
        hasContactAlarm: (zones: Zone | Zone[] | undefined) =>
            inZones(zones).some(device => device.getLocalCapabilityValue('alarm_contact')?.value === true),
        hasMotionAlarm: (zones: Zone | Zone[] | undefined) =>
            inZones(zones).some(device => device.getLocalCapabilityValue('alarm_motion')?.value === true),
        isPhysicalUpdateRequired: (device: Device, capabilityId: string, value: unknown) =>
            device.hasChangedValue(capabilityId, value),
    } as Devices;
}
