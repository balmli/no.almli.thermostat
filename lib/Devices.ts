// @ts-nocheck

import {HomeyAPIV3Local} from 'homey-api';
import {
    capabilityIdFormat,
    Device,
    DeviceClass,
    DeviceRequest,
    DeviceRequests,
    SUPPORTED_CAPABILITIES,
    SUPPORTED_CLASSES,
    Zone,
} from './types';
import {Calculator} from './Calculator';
import {DeviceMapper} from './DeviceMapper';
import {fromCanonicalTemperature, toCanonicalTemperature} from './TemperatureUnits';

type PendingPhysicalUpdate = {
    value: any;
};

export class Devices {
    private homey: any;
    private logger: any;
    private calculator?: Calculator;
    private devices: Device[];
    private capabilityInstances: Map<string, HomeyAPIV3Local.ManagerDevices.Device.DeviceCapability>;
    private pendingPhysicalUpdates: Map<string, PendingPhysicalUpdate>;

    constructor(devicesAsMap?: {[key: string]: HomeyAPIV3Local.ManagerDevices.Device}, homey?: any, logger?: any) {
        this.homey = homey;
        this.logger = logger;
        this.capabilityInstances = new Map<string, HomeyAPIV3Local.ManagerDevices.Device.DeviceCapability>();
        this.pendingPhysicalUpdates = new Map<string, PendingPhysicalUpdate>();
        this.devices = new Array<Device>();
        this.registerDevices(devicesAsMap);
    }

    destroy(): void {
        for (const ci of this.capabilityInstances.values()) {
            ci.destroy();
        }
        this.capabilityInstances.clear();
        this.pendingPhysicalUpdates.clear();
    }

    setCalculator(calculator?: Calculator): void {
        this.calculator = calculator;
    }

    /**
     * Return all devices or by a device class.
     * @param deviceClass
     */
    getDevices(deviceClass?: DeviceClass): Device[] {
        return this.devices.filter(d => Devices.filterDeviceClass(d, deviceClass));
    }

    /**
     * Get a device by id.
     * @param id
     */
    getDevice(id: string): Device | undefined {
        return this.devices.find(d => d.id === id);
    }

    /**
     * Get a device by data Id.
     * @param dataId
     */
    getDeviceByDataId(dataId: string): Device | undefined {
        return this.devices.find(d => d.dataId === dataId);
    }

    /**
     * Update local device, local capability and start calculation.
     * @param dataId
     * @param capabilityId
     * @param value
     */
    updateByDataId(dataId: string, capabilityId: string, value: any): void {
        const device = this.getDeviceByDataId(dataId);
        if (device) {
            if (device.hasChangedValue(capabilityId, value)) {
                device.setLocalCapabilityValue(capabilityId, value);
                this.calculator?.startCalculation(1);
                this.logger?.debug(`Updated device by data id: capability HARD: ${device.id} ${capabilityId}`, value);
            }
        } else {
            this.logger?.warn(`Updata by data id: unknown device: ${dataId}`);
        }
    }

    /**
     * Update mapped settings for a local virtual device and start calculation.
     * @param dataId
     * @param settings complete Homey settings object
     */
    updateSettingsByDataId(dataId: string, settings: any): void {
        const device = this.getDeviceByDataId(dataId);
        if (device) {
            DeviceMapper.mapSettings(device, device.driverId, settings);
            this.calculator?.startCalculation(1);
            this.logger?.debug(`Updated device settings by data id: ${device.id}`);
        } else {
            this.logger?.warn(`Update settings by data id: unknown device: ${dataId}`);
        }
    }

    /**
     * Register devices from a map of devices.
     * @param devicesAsMap
     */
    registerDevices(devicesAsMap?: {[key: string]: HomeyAPIV3Local.ManagerDevices.Device}): void {
        if (devicesAsMap) {
            const registeredDeviceIds = new Set<string>();
            for (const key in devicesAsMap) {
                if (devicesAsMap.hasOwnProperty(key)) {
                    const device = devicesAsMap[key];
                    if (this.registerDevice(device)) {
                        registeredDeviceIds.add(device.id);
                    }
                }
            }
            for (const device of [...this.devices]) {
                if (!registeredDeviceIds.has(device.id)) {
                    this.deleteDevice({id: device.id} as HomeyAPIV3Local.ManagerDevices.Device);
                }
            }
            this.logger?.info(`Registered devices. (${this.devices.length} devices)`);
            this.calculator?.startCalculation();
        }
    }

    /**
     * Create or update a device.
     * @param device
     */
    createOrUpdateDevice(device: HomeyAPIV3Local.ManagerDevices.Device): Device | undefined {
        if (!this.validAndSupported(device)) {
            if (device?.id && this.getDevice(device.id)) {
                this.deleteDevice(device);
            }
            return;
        }
        const current = this.getDevice(device.id);
        if (current) {
            this.replaceCapabilityInstances(device, current);
            this.updateDeviceData(current, device);
            this.calculator?.startCalculation();
            return current;
        } else {
            const deviz = this.registerDevice(device);
            if (deviz) {
                this.calculator?.startCalculation();
                this.logger?.debug(`Created device: ${device.id} ${device.name}. (${this.devices.length} devices)`);
            }
            return deviz;
        }
    }

    /**
     * Delete a device.
     * @param device
     */
    deleteDevice(device: HomeyAPIV3Local.ManagerDevices.Device): void {
        const idx = this.devices.findIndex(d => d.id === device.id);
        if (idx >= 0) {
            const deviz = this.devices[idx];
            if (deviz.capabilitiesObj) {
                for (const capabilityId of deviz.capabilitiesObj.keys()) {
                    this.destroyCapabilityInstance(capabilityIdFormat(device.id, capabilityId));
                }
            }
            this.devices.splice(idx, 1);
            for (const key of this.pendingPhysicalUpdates.keys()) {
                if (key.startsWith(`${device.id}_`)) {
                    this.pendingPhysicalUpdates.delete(key);
                }
            }
            this.logger?.debug(`Deleted device: ${device.id}. (${this.devices.length} devices)`);
            this.calculator?.startCalculation();
        }
    }

    private updateDeviceData(device: Device, updatedDevice: HomeyAPIV3Local.ManagerDevices.Device): void {
        const newDevice = DeviceMapper.map(updatedDevice);
        this.confirmPhysicalUpdates(newDevice);
        if (Devices.deviceChanged(device, updatedDevice)) {
            device.name = newDevice.name;
            device.class = newDevice.class;
            device.virtualClass = newDevice.virtualClass;
            device.zone = newDevice.zone;
            device.ready = newDevice.ready;
            device.available = newDevice.available;
            this.logger?.debug(`Updated device data: ${device.id}`, device);
        }
        if (
            Devices.deviceCapabilitiesChanged(device, updatedDevice) ||
            Devices.deviceCapabilityValuesChanged(device, newDevice)
        ) {
            this.logger?.debug(`Updated device capabilities: ${device.id}`, device);
        }
        device.capabilities = newDevice.capabilities;
        device.capabilitiesObj = newDevice.capabilitiesObj;
        device.temperatureSettings = newDevice.temperatureSettings;
        device.deviceSettings = newDevice.deviceSettings;
        device.targetSettings = newDevice.targetSettings;
        device.humiditySettings = newDevice.humiditySettings;
    }

    private static deviceChanged(device: Device, updatedDevice: HomeyAPIV3Local.ManagerDevices.Device): boolean {
        return (
            device.name !== updatedDevice.name ||
            device.class !== updatedDevice.class ||
            device.virtualClass !== updatedDevice.virtualClass ||
            device.zone !== updatedDevice.zone ||
            device.ready !== updatedDevice.ready ||
            device.available !== updatedDevice.available
        );
    }

    private static deviceCapabilitiesChanged(
        device: Device,
        updatedDevice: HomeyAPIV3Local.ManagerDevices.Device,
    ): boolean {
        return (
            device.capabilities?.length !== updatedDevice.capabilities?.length ||
            device.capabilities?.slice().sort().join(',') !== updatedDevice.capabilities?.slice().sort().join(',')
        );
    }

    private static deviceCapabilityValuesChanged(device: Device, updatedDevice: Device): boolean {
        return [...(updatedDevice.capabilitiesObj?.entries() ?? [])].some(([capabilityId, capability]) => {
            const current = device.capabilitiesObj?.get(capabilityId);
            return !current || current.value !== capability.value || current.lastUpdated !== capability.lastUpdated;
        });
    }

    private static filterDeviceClass = (d: Device, deviceClass?: DeviceClass): boolean => {
        return (
            !deviceClass ||
            (d.class === deviceClass && !d.isVThermo() && !d.isVHumidity()) ||
            (d.virtualClass === deviceClass && !d.isVThermo() && !d.isVHumidity()) ||
            (deviceClass === DeviceClass.vthermo && d.isVThermo()) ||
            (deviceClass === DeviceClass.vhumidity && d.isVHumidity())
        );
    };

    /**
     * Get devices from a zone, by zone id.
     * @param zoneId
     * @param deviceClass filter by device class (optional)
     */
    getDevicesFromZone(zoneId: string, deviceClass?: DeviceClass): Device[] | undefined {
        return this.devices.filter(d => d.zone === zoneId).filter(d => Devices.filterDeviceClass(d, deviceClass));
    }

    /**
     * Get devices from a list of zones.
     * @param zone a zone or a list of zones.
     * @param deviceClass filter by device class (optional)
     */
    getDevicesFromZones(zone: Zone | Zone[] | undefined, deviceClass?: DeviceClass): Device[] | undefined {
        if (!zone) {
            return undefined;
        }
        const zones = Array.isArray(zone) ? zone : [zone];
        const zoneIds: string[] = zones.map(z => z.id);
        return this.devices
            .filter(d => d.zone && zoneIds.includes(d.zone))
            .filter(d => Devices.filterDeviceClass(d, deviceClass));
    }

    /**
     * Returns true if there is a sensor with a contact alarm in the zone.
     * @param zone
     */
    hasContactAlarm(zone: Zone | Zone[] | undefined): boolean {
        if (zone) {
            const zones = Array.isArray(zone) ? zone : [zone];
            const withContactAlarm = this.getDevicesFromZones(zones)
                ?.filter(d => d.class === 'sensor')
                ?.filter(d => d.hasCapability('alarm_contact'))
                ?.filter(d => d.getLocalCapabilityValue('alarm_contact').value === true);
            return !!(withContactAlarm && withContactAlarm.length > 0);
        }
        return false;
    }

    /**
     * Returns true if there is a sensor with a motion alarm in the zone.
     * @param zone
     */
    hasMotionAlarm(zone: Zone | Zone[] | undefined): boolean {
        if (zone) {
            const zones = Array.isArray(zone) ? zone : [zone];
            const withMotionAlarm = this.getDevicesFromZones(zones)
                ?.filter(d => d.class === 'sensor')
                ?.filter(d => d.hasCapability('alarm_motion'))
                ?.filter(d => d.getLocalCapabilityValue('alarm_motion').value === true);
            return !!(withMotionAlarm && withMotionAlarm.length > 0);
        }
        return false;
    }

    private registerDevice(device: HomeyAPIV3Local.ManagerDevices.Device): Device | undefined {
        if (this.validAndSupported(device)) {
            const create = this.replaceCapabilityInstances(device, this.getDevice(device.id));
            if (create) {
                const deviceId = device.id;
                const idx = this.devices.findIndex(d => d.id === deviceId);
                const deviz = DeviceMapper.map(device);
                this.confirmPhysicalUpdates(deviz);
                if (idx >= 0) {
                    this.devices[idx] = deviz;
                } else {
                    this.devices.push(deviz);
                }
                return deviz;
            }
        }
    }

    /**
     * Check if valid and supported device.
     * @param device
     */
    validAndSupported(device: HomeyAPIV3Local.ManagerDevices.Device): boolean {
        return this.validDevice(device) && this.supportedDevice(device);
    }

    private validDevice(device: HomeyAPIV3Local.ManagerDevices.Device): boolean {
        const ret =
            !!device &&
            typeof device === 'object' &&
            !!device.id &&
            !!device.name &&
            device.ready &&
            device.available &&
            !!device.capabilities &&
            !!device.capabilitiesObj;
        if (!ret) {
            this.logger?.silly(`Invalid device: ${device.id} - ${device.name}`);
        }
        return ret;
    }

    private replaceCapabilityInstances(device: HomeyAPIV3Local.ManagerDevices.Device, current?: Device): boolean {
        const capabilities = device.capabilitiesObj;
        const supportedCapabilityIds = Object.keys(capabilities).filter(capabilityId =>
            SUPPORTED_CAPABILITIES.includes(capabilityId),
        );
        const supportedCapabilityIdSet = new Set(supportedCapabilityIds);

        for (const capabilityId of current?.capabilitiesObj?.keys() ?? []) {
            if (!supportedCapabilityIdSet.has(capabilityId)) {
                this.destroyCapabilityInstance(capabilityIdFormat(device.id, capabilityId));
            }
        }

        if (!device.makeCapabilityInstance) {
            return true;
        }

        for (const capabilityId of supportedCapabilityIds) {
            this.makeCapabilityInstance(device, capabilityId);
        }
        return supportedCapabilityIds.length > 0;
    }

    private supportedDevice(device: HomeyAPIV3Local.ManagerDevices.Device): boolean {
        const ret =
            SUPPORTED_CLASSES.includes(device.class) ||
            device.capabilitiesObj.hasOwnProperty('measure_temperature') ||
            device.capabilitiesObj.hasOwnProperty('alarm_contact') ||
            device.capabilitiesObj.hasOwnProperty('alarm_motion');
        if (!ret) {
            this.logger?.silly(`Not supported device: ${device.id} - ${device.name}: class=${device.class}`);
        }
        return ret;
    }

    private makeCapabilityInstance(device: HomeyAPIV3Local.ManagerDevices.Device, capabilityId: string) {
        try {
            const deviceCapabilityId = capabilityIdFormat(device.id, capabilityId);
            this.destroyCapabilityInstance(deviceCapabilityId);
            //device.setMaxListeners(100);
            const capabilityInstance = device.makeCapabilityInstance(capabilityId, value =>
                this.capabilityInstanceListener(device, capabilityId, value),
            );
            this.capabilityInstances.set(deviceCapabilityId, capabilityInstance);
            this.logger?.verbose(
                `Registered capability instance: ${device.id} ${device.name} ${capabilityId} (${this.capabilityInstances.size} active)`,
            );
        } catch (err) {
            this.logger?.error('Error creating capability instance: ' + capabilityId, err);
        }
    }

    private capabilityInstanceListener(
        device: HomeyAPIV3Local.ManagerDevices.Device,
        capabilityId: string,
        value: any,
    ) {
        const deviz = this.getDevice(device.id);
        if (deviz) {
            const capability = deviz.getLocalCapabilityValue(capabilityId);
            const canonicalValue = toCanonicalTemperature(capabilityId, value, capability?.units);
            this.confirmPhysicalUpdate(device.id, capabilityId, canonicalValue);
            if (deviz.hasChangedValue(capabilityId, canonicalValue)) {
                deviz.setLocalCapabilityValue(capabilityId, canonicalValue);
                this.calculator?.startCalculation();
                this.logger?.debug(
                    `Updated device capability: ${device.id} ${capabilityId} at ${new Date().toISOString()}`,
                );
            }
        }
    }

    private destroyCapabilityInstance(deviceCapabilityId: string) {
        const capabilityInstance = this.capabilityInstances.get(deviceCapabilityId);
        if (capabilityInstance) {
            capabilityInstance.destroy();
            this.capabilityInstances.delete(deviceCapabilityId);
            this.logger?.debug('Destroyed capability instance: ', deviceCapabilityId);
        }
    }

    private confirmPhysicalUpdate(deviceId: string, capabilityId: string, value: any): void {
        const key = capabilityIdFormat(deviceId, capabilityId);
        const pending = this.pendingPhysicalUpdates.get(key);
        if (pending && pending.value === value) {
            this.pendingPhysicalUpdates.delete(key);
            this.logger?.verbose(`Physical update confirmed: ${deviceId}:${capabilityId} -> ${value}`);
        }
    }

    private confirmPhysicalUpdates(device: Device): void {
        for (const [capabilityId, capability] of device.capabilitiesObj?.entries() ?? []) {
            this.confirmPhysicalUpdate(device.id, capabilityId, capability.value);
        }
    }

    isPhysicalUpdateRequired(device: Device, capabilityId: string, value: any): boolean {
        if (!device.hasCapability(capabilityId) || value === undefined) {
            return false;
        }
        const pending = this.pendingPhysicalUpdates.get(capabilityIdFormat(device.id, capabilityId));
        if (pending) {
            return pending.value !== value;
        }
        return device.hasChangedValue(capabilityId, value);
    }

    private trackPhysicalUpdate(dr: {id: string; capabilityId: string; value?: any}): PendingPhysicalUpdate {
        const key = capabilityIdFormat(dr.id, dr.capabilityId);
        const current = this.pendingPhysicalUpdates.get(key);
        const pending = {value: dr.value};
        this.pendingPhysicalUpdates.set(key, pending);
        if (current && current.value !== pending.value) {
            this.logger?.verbose(
                `Physical update superseded: ${dr.id}:${dr.capabilityId} ${current.value} -> ${pending.value}`,
            );
        }
        return pending;
    }

    private async updatePhysicalDevice(dr: DeviceRequest): Promise<void> {
        const key = capabilityIdFormat(dr.id, dr.capabilityId);
        const pending = this.trackPhysicalUpdate(dr);
        try {
            const capability = this.getDevice(dr.id)?.getLocalCapabilityValue(dr.capabilityId);
            const apiValue = fromCanonicalTemperature(dr.capabilityId, dr.value, capability?.units);
            await this.homey?.app.setCapabilityValue(dr.id, dr.capabilityId, apiValue);
            if (dr.deviceDelay && dr.deviceDelay > 0) {
                await this.homey?.app.delay(dr.deviceDelay);
            }
            this.logger?.verbose(`Update device:(other): ${dr.id}:${dr.capabilityId} -> ${dr.value}`);
        } catch (err) {
            if (this.pendingPhysicalUpdates.get(key) === pending) {
                this.pendingPhysicalUpdates.delete(key);
            }
            this.logger?.error('Update devices: UPDATE DEVICE failed:', dr, err);
        }
    }

    /**
     * Update devices, based in array of device requests.
     * @param deviceRequests
     */
    async updateDevices(deviceRequests: DeviceRequests): Promise<void> {
        for (const dr of deviceRequests.getRequests()) {
            // dataId is only set for VThermo and VHumidity
            if (dr.dataId) {
                const localDevice = this.homey?.app.getDeviceByDataId(dr.dataId);
                if (localDevice) {
                    try {
                        await localDevice.setCapabilityValue(dr.capabilityId, dr.value);
                        // For VHumidity: add to value store
                        if (
                            localDevice.getValueStore &&
                            dr.capabilityId === 'measure_humidity' &&
                            dr.value !== undefined &&
                            dr.value !== null
                        ) {
                            localDevice.getValueStore().addValue(dr.value);
                        }
                        if (!!dr.trigger) {
                            await this.homey?.flow
                                .getDeviceTriggerCard(dr.trigger)
                                .trigger(localDevice, {state: dr.value ? 1 : 0}, {})
                                .catch((err: any) =>
                                    this.logger?.error(`Trigger failed: ${dr.id} ${dr.capabilityId}:`, err),
                                );
                        }
                        this.logger?.verbose(
                            `Update: ${dr.id}:${localDevice.getName()}:${dr.capabilityId} -> ${dr.value}`,
                        );
                    } catch (err) {
                        this.logger?.error('Update devices: UPDATE LOCAL failed:', dr, err);
                    }
                } else {
                    this.logger?.warn(`Update device: Has dataId, but is not a local device`, dr);
                }
            } else {
                await this.updatePhysicalDevice(dr);
            }
        }
    }
}
