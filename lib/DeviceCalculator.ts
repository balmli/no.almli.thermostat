import {Zones} from "./Zones";
import {Devices} from "./Devices";
import {
    Device,
    DeviceRequest,
    DeviceRequests, DRIVER_VHUMIDITY, DRIVER_VTHERMO,
    Zone
} from "./types";

export class DeviceCalculator {

    protected zonesObj!: Zones;
    protected devicesObj!: Devices;
    protected logger: any;

    constructor(zonesObj: Zones, devicesObj: Devices, logger?: any) {
        this.zonesObj = zonesObj;
        this.devicesObj = devicesObj;
        this.logger = logger;
    }

    calculate(zone: Zone): DeviceRequests {
        throw new Error("Not implemented");
    }

    /**
     * Updates the capability if the value has changed,
     * and returns a device request.
     * @param device
     * @param capabilityId
     * @param value
     */
    updateAndCreateDeviceRequestIfChanged(device: Device, capabilityId: string, value: any): DeviceRequest | undefined {
        if (device.hasChangedValue(capabilityId, value)) {
            device.setLocalCapabilityValue(capabilityId, value);
            //this.logger?.info('DeviceCalculator: updated ', `DeviceCalculator: updated ${device.id} ${device.name} ${capabilityId} = ${value}`);
            const dr = new DeviceRequest();
            dr.id = device.id;
            if (device.driverId === DRIVER_VTHERMO || device.driverId === DRIVER_VHUMIDITY) {
                dr.dataId = device.dataId;
            }
            dr.capabilityId = capabilityId;
            dr.value = value;
            dr.debugInfo = JSON.stringify({
                name: device.name,
                dataId: device.dataId,
                driverId: device.driverId,
                class: device.class
            });
            return dr;
        }
    }

}
