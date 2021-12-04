import {HomeyAPI} from "athom-api";
import {
    capabilityIdFormat,
    Device,
    DeviceCapabilityEvent,
    DeviceClass,
    DeviceRequests,
    SUPPORTED_CAPABILITIES,
    SUPPORTED_CLASSES,
    Zone
} from "./types";
import {Calculator} from "./Calculator";
import {DeviceMapper} from "./DeviceMapper";

export class Devices {

    private homey: any;
    private logger: any;
    private calculator?: Calculator;
    private devices: Device[];
    private capabilityInstances: Map<string, HomeyAPI.ManagerDevices.Device.CapabilityInstance>;

    constructor(devicesAsMap?: { [key: string]: HomeyAPI.ManagerDevices.Device; }, homey?: any, logger?: any) {
        this.homey = homey;
        this.logger = logger;
        this.capabilityInstances = new Map<string, HomeyAPI.ManagerDevices.Device.CapabilityInstance>();
        this.devices = new Array<Device>();
        this.registerDevices(devicesAsMap);
    }

    destroy(): void {
        for (const ci of this.capabilityInstances.values()) {
            ci.destroy();
        }
    }

    setCalculator(calculator?: Calculator): void {
        this.calculator = calculator;
    }

    /**
     * Return all devices or by a device class.
     * @param deviceClass
     */
    getDevices(deviceClass?: DeviceClass): Device[] {
        return this.devices
            .filter(d => Devices.filterDeviceClass(d, deviceClass))
            ;
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
            this.logger?.warn(`Updata by data id: unknown device: ${dataId}`)
        }
    }

    /**
     * Register devices from a map of devices.
     * @param devicesAsMap
     */
    registerDevices(devicesAsMap?: { [key: string]: HomeyAPI.ManagerDevices.Device; }): void {
        if (devicesAsMap) {
            for (const key in devicesAsMap) {
                if (devicesAsMap.hasOwnProperty(key)) {
                    const device = devicesAsMap[key];
                    this.registerDevice(device);
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
    createOrUpdateDevice(device: HomeyAPI.ManagerDevices.Device): Device | undefined {
        if (!this.validAndSupported(device)) {
            return;
        }
        const current = this.getDevice(device.id);
        if (current) {
            this.updateDeviceData(current, device);
            return current;
        } else {
            const deviz = this.registerDevice(device);
            if (deviz) {
                this.logger?.debug(`Created device: ${device.id} ${device.name}. (${this.devices.length} devices)`);
            }
            return deviz;
        }
    }

    /**
     * Delete a device.
     * @param device
     */
    deleteDevice(device: HomeyAPI.ManagerDevices.Device): void {
        const idx = this.devices.findIndex(d => d.id === device.id);
        if (idx >= 0) {
            const deviz = this.devices[idx];
            if (deviz.capabilitiesObj) {
                for (const capabilityId of deviz.capabilitiesObj.keys()) {
                    this.destroyCapabilityInstance(capabilityIdFormat(device.id, capabilityId));
                }
            }
            this.devices.splice(idx, 1);
            this.logger?.debug(`Deleted device: ${device.id}. (${this.devices.length} devices)`);
        }
    }

    private updateDeviceData(device: Device, updatedDevice: HomeyAPI.ManagerDevices.Device): void {
        const newDevice = DeviceMapper.map(updatedDevice);
        if (Devices.deviceChanged(device, updatedDevice)) {
            device.name = newDevice.name;
            device.class = newDevice.class;
            device.virtualClass = newDevice.virtualClass;
            device.zone = newDevice.zone;
            device.ready = newDevice.ready;
            device.available = newDevice.available;
            this.logger?.debug(`Updated device data: ${device.id}`, device);
        }
        if (Devices.deviceCapabilitiesChanged(device, updatedDevice)) {
            device.capabilities = newDevice.capabilities;
            device.capabilitiesObj = newDevice.capabilitiesObj;
            this.logger?.debug(`Updated device capabilities: ${device.id}`, device);
        }
        device.temperatureSettings = newDevice.temperatureSettings;
        device.deviceSettings = newDevice.deviceSettings;
        device.targetSettings = newDevice.targetSettings;
        device.humiditySettings = newDevice.humiditySettings;
    }

    private static deviceChanged(device: Device, updatedDevice: HomeyAPI.ManagerDevices.Device): boolean {
        return device.name !== updatedDevice.name
            || device.class !== updatedDevice.class
            || device.virtualClass !== updatedDevice.virtualClass
            || device.zone !== updatedDevice.zone
            || device.ready !== updatedDevice.ready
            || device.available !== updatedDevice.available
            ;
    }

    private static deviceCapabilitiesChanged(device: Device, updatedDevice: HomeyAPI.ManagerDevices.Device): boolean {
        return device.capabilities?.length !== updatedDevice.capabilities?.length
            || device.capabilities?.slice().sort().join(",") !== updatedDevice.capabilities?.slice().sort().join(",")
            ;
    }

    private static filterDeviceClass = (d: Device, deviceClass?: DeviceClass): boolean => {
        return !deviceClass ||
            (((d.class === deviceClass) && !d.isVThermo() && !d.isVHumidity()))
            || (((d.virtualClass === deviceClass) && !d.isVThermo() && !d.isVHumidity()))
            || (((deviceClass === DeviceClass.vthermo) && d.isVThermo()))
            || (((deviceClass === DeviceClass.vhumidity) && d.isVHumidity()))
            ;
    }

    /**
     * Get devices from a zone, by zone id.
     * @param zoneId
     * @param deviceClass filter by device class (optional)
     */
    getDevicesFromZone(zoneId: string, deviceClass?: DeviceClass): Device[] | undefined {
        return this.devices
            .filter(d => d.zone === zoneId)
            .filter(d => Devices.filterDeviceClass(d, deviceClass))
            ;
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
            .filter(d => Devices.filterDeviceClass(d, deviceClass))
            ;
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

    private registerDevice(device: HomeyAPI.ManagerDevices.Device): Device | undefined {
        if (this.validAndSupported(device)) {
            let create = !device.makeCapabilityInstance;
            if (!!device.makeCapabilityInstance) {
                const capabilities = device.capabilitiesObj;
                for (const capabilityId in capabilities) {
                    if (capabilities.hasOwnProperty(capabilityId) &&
                        SUPPORTED_CAPABILITIES.includes(capabilityId)) {
                        this.makeCapabilityInstance(device, capabilityId);
                        create = true;
                    }
                }
            }
            if (create) {
                const deviceId = device.id;
                const idx = this.devices.findIndex(d => d.id === deviceId);
                const deviz = DeviceMapper.map(device);
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
    validAndSupported(device: HomeyAPI.ManagerDevices.Device): boolean {
        return this.validDevice(device) &&
            this.supportedDevice(device);
    }

    private validDevice(device: HomeyAPI.ManagerDevices.Device): boolean {
        const ret = !!device
            && typeof device === 'object'
            && !!device.id
            && !!device.name
            && device.available
            && !!device.capabilities
            && !!device.capabilitiesObj;
        if (!ret) {
            this.logger?.silly(`Invalid device: ${device.id} - ${device.name}`);
        }
        return ret;
    }

    private supportedDevice(device: HomeyAPI.ManagerDevices.Device): boolean {
        const ret = SUPPORTED_CLASSES.includes(device.class)
            || device.capabilitiesObj.hasOwnProperty('measure_temperature')
            || device.capabilitiesObj.hasOwnProperty('alarm_contact')
            || device.capabilitiesObj.hasOwnProperty('alarm_motion')
        ;
        if (!ret) {
            this.logger?.silly(`Not supported device: ${device.id} - ${device.name}: class=${device.class}`);
        }
        return ret;
    }

    private makeCapabilityInstance(device: HomeyAPI.ManagerDevices.Device, capabilityId: string) {
        try {
            const deviceCapabilityId = capabilityIdFormat(device.id, capabilityId);
            this.destroyCapabilityInstance(deviceCapabilityId);
            //device.setMaxListeners(100);
            const capabilityInstance = device.makeCapabilityInstance(capabilityId, value =>
                this.capabilityInstanceListener(device, capabilityId, value)
            );
            this.capabilityInstances.set(deviceCapabilityId, capabilityInstance);
            this.logger?.verbose(`Registered capability instance: ${device.id} ${device.name} ${capabilityId}`);
        } catch (err) {
            this.logger?.error("Error creating capability instance: " + capabilityId, err);
        }
    }

    private capabilityInstanceListener(device: HomeyAPI.ManagerDevices.Device, capabilityId: string, value: any) {
        const event: DeviceCapabilityEvent = {
            deviceId: device.id,
            capId: capabilityId,
            value: value
        };
        this.logger?.info(`Capability instance event: ${device.name}:`, event);

        const deviz = this.getDevice(device.id);
        if (deviz) {
            if (deviz.hasChangedValue(capabilityId, value)) {
                deviz.setLocalCapabilityValue(capabilityId, value);
                this.calculator?.startCalculation();
                this.logger?.debug(`Updated device capability: ${device.id} ${capabilityId}`);
            }
        }
    }

    private destroyCapabilityInstance(deviceCapabilityId: string) {
        const capabilityInstance = this.capabilityInstances.get(deviceCapabilityId);
        if (capabilityInstance) {
            capabilityInstance.destroy();
            this.capabilityInstances.delete(deviceCapabilityId);
            this.logger?.debug("Destroyed capability instance: ", deviceCapabilityId);
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
                        if (localDevice.getValueStore &&
                            (dr.capabilityId === 'measure_humidity') &&
                            (dr.value !== undefined) &&
                            (dr.value !== null)) {
                            localDevice.getValueStore().addValue(dr.value);
                        }
                        if (!!dr.trigger) {
                            await this.homey?.flow.getDeviceTriggerCard(dr.trigger)
                                .trigger(localDevice, {state: dr.value ? 1 : 0}, {})
                                .catch((err: any) => this.logger?.error(`Trigger failed: ${dr.id} ${dr.capabilityId}:`, err));
                        }
                        this.logger?.verbose(`Update: ${dr.id}:${localDevice.getName()}:${dr.capabilityId} -> ${dr.value}`);
                    } catch (err) {
                        this.logger?.error('Update devices: UPDATE LOCAL failed:', dr, err);
                    }
                } else {
                    this.logger?.warn(`Update device: Has dataId, but is not a local device`, dr);
                }
            } else {
                if (dr.deviceDelay && dr.deviceDelay > 0) {
                    try {
                        await this.homey?.app.setCapabilityValue(dr.id, dr.capabilityId, dr.value);
                        await this.homey?.app.delay(dr.deviceDelay);
                        this.logger?.verbose(`Update device:(other): ${dr.id}:${dr.capabilityId} -> ${dr.value}`);
                    } catch (err) {
                        this.logger?.error('Update devices: UPDATE DEVICE failed:', dr, err);
                    }
                } else {
                    this.homey?.app.setCapabilityValue(dr.id, dr.capabilityId, dr.value)
                        .then(() => this.logger?.verbose(`Update device:(other): ${dr.id}:${dr.capabilityId} -> ${dr.value}`))
                        .catch((err: any) => this.logger?.error('Update devices: UPDATE DEVICE failed:', dr, err));
                }
            }
        }
    }
}