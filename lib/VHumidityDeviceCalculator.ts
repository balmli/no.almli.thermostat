import {
    CalcMethodHumidity,
    CAPABILITY_ACTIVE,
    Device,
    DeviceCapability,
    DeviceClass,
    DeviceRequest,
    DeviceRequests,
    DeviceSettings,
    HumiditySettings,
    Zone
} from "./types";
import {DeviceCalculator} from "./DeviceCalculator";
import {Zones} from "./Zones";

const math = require('./math');

export class VHumidityDeviceCalculator extends DeviceCalculator {

    calculate(zone: Zone): DeviceRequests {
        const requests = new DeviceRequests();
        const vhumidities = this.devicesObj.getDevicesFromZones(zone, DeviceClass.vhumidity);
        if (vhumidities && vhumidities.length > 0) {
            this.logger?.silly(`Will calculate ${zone.name} with ${vhumidities.length} VTHumidities`);
            for (const vhumidity of vhumidities) {
                requests.addRequest(this.calculateMeasureHumidity(vhumidity, zone));
                requests.addRequests(this.calculateFanSwitching(vhumidity, zone));
            }
        }
        return requests;
    }

    /**
     * Get humidity in a zone or list of zones.
     * @param zone a zone or a list of zones
     */
    getHumiditiesInZone(zone: Zone | Zone[] | undefined): DeviceCapability[] {
        const dcs: DeviceCapability[] = [];
        if (zone) {
            const zones = Array.isArray(zone) ? zone : [zone];
            for (const z of zones) {
                const devices = this.devicesObj.getDevicesFromZones(zones);
                const humidities = devices
                    ?.filter(d => d.class === 'sensor')
                    .filter(d => d.capabilitiesObj && d.capabilitiesObj.has('measure_humidity'))
                    .map(d => d.capabilitiesObj && d.capabilitiesObj?.get('measure_humidity'));
                if (humidities) {
                    // @ts-ignore
                    dcs.push(...humidities);
                }
            }
        }
        return dcs;
    }

    /**
     * Get humidity for a zone.
     * @param zone the zone
     * @param zonesObj zone manager
     * @param humiditySettings humidity settings
     */
    getHumidities(zone: Zone | undefined, zonesObj: Zones, humiditySettings: HumiditySettings | undefined): DeviceCapability[] {
        const dcs: DeviceCapability[] = [];
        if (zone && humiditySettings) {
            dcs.push(...this.getHumiditiesInZone(zone));
        }
        return dcs;
    }

    calculateMeasureHumidity(device: Device, zone: Zone): DeviceRequest | undefined {
        const humiditySettings = device.humiditySettings;
        const hums = this.getHumidities(zone, this.zonesObj, humiditySettings);
        if (hums.length > 0) {
            this.logger?.debug(`Got humidifies for VTHumidity: ${zone.name} - ${device.id} - ${device.name}`, hums);
        }
        const humidity = this.calculateHumidity(hums, humiditySettings);
        return this.updateAndCreateDeviceRequestIfChanged(device, 'measure_humidity', humidity);
    }

    private calculateHumidity(humidities: DeviceCapability[], humSettings?: HumiditySettings): number | null | undefined {
        let humidity = null;
        if (humidities.length > 0 && humSettings) {
            if (humSettings.calcMethod === CalcMethodHumidity.AVERAGE) {
                humidity = math.round(math.average(humidities));
            } else if (humSettings.calcMethod === CalcMethodHumidity.MIN) {
                humidity = math.min(humidities);
            } else if (humSettings.calcMethod === CalcMethodHumidity.MAX) {
                humidity = math.max(humidities);
            } else if (humSettings.calcMethod === CalcMethodHumidity.NEWEST) {
                humidity = math.newest(humidities);
            } else {
                this.logger?.error('calculatedHumidity: unsupported calc method', humSettings.calcMethod);
            }
        }
        return humidity;
    }

    /**
     * Calculate if the VHumidity and fans in the zone should be switched.
     * @param device
     * @param zone
     * @private
     */
    calculateFanSwitching(device: Device, zone: Zone): DeviceRequests {
        const requests = new DeviceRequests();

        const deviceSettings = device.deviceSettings;
        if (!deviceSettings) {
            return requests;
        }

        const targetHumidity = device.getLocalCapabilityValue('vh_target_humidity');
        if (!targetHumidity || targetHumidity.value === undefined || targetHumidity.value === null) {
            return requests;
        }

        const humidity = device.getLocalCapabilityValue('measure_humidity');
        if (!humidity || humidity.value === undefined || humidity.value === null) {
            return requests;
        }

        const onoff = this.resolveOnOff(device, humidity.value, targetHumidity.value);

        if (onoff !== undefined) {
            const dr = this.updateAndCreateDeviceRequestIfChanged(device, CAPABILITY_ACTIVE, onoff);
            if (dr) {
                dr.trigger = `vh_onoff_${dr.value ? 'true' : 'false'}`;
            }
            requests.addRequest(dr);

            const fans = this.getFans(zone, this.zonesObj, device.deviceSettings);
            for (const fan of fans) {
                const dr = this.updateAndCreateDeviceRequestIfChanged(fan, 'onoff', onoff);
                if (dr && deviceSettings.deviceDelay && deviceSettings.deviceDelay > 0) {
                    dr.deviceDelay = deviceSettings.deviceDelay;
                }
                requests.addRequest(dr);
            }
        }

        return requests;
    }

    /**
     * Resolve if the VHumidity should be on or off.
     * @param device
     * @param humidity
     * @param targetHumidity
     */
    resolveOnOff(device: Device, humidity: number, targetHumidity: number): boolean | undefined {
        const deviceSettings = device.deviceSettings;
        if (!deviceSettings) {
            this.logger?.error('No device settings');
            return;
        }
        if (!device.isVHumidity()) {
            this.logger?.error('Unable to resolve on / off.  Unsupported device', device);
            return;
        }

        const currentOnoff = device.getLocalCapabilityValue('onoff').value;
        const currentVtOnoff = device.getLocalCapabilityValue(CAPABILITY_ACTIVE).value;

        const mainOnoff = deviceSettings.onoffEnabled ? currentOnoff : true;

        let onoff = undefined;
        if (!mainOnoff) {
            onoff = currentVtOnoff === true ? false : undefined;
        } else {
            const hysteresis = deviceSettings.hysteresis || 1;
            const invert = deviceSettings.invert;
            if (humidity > (targetHumidity + hysteresis)) {
                onoff = invert !== true;
            } else if (humidity < (targetHumidity - hysteresis)) {
                onoff = invert === true;
            }
        }

        return onoff;
    }

    /**
     * Get fans for a zone, with current zone and children zones.
     * @param zone the zone
     * @param zonesObj zone manager
     * @param deviceSettings device settings
     */
    getFans(zone: Zone, zonesObj: Zones, deviceSettings?: DeviceSettings): Device[] {
        const dcs: Device[] = [];
        if (deviceSettings) {
            const zones = [];
            if (deviceSettings.zone && deviceSettings.zone.clazz) {
                zones.push(zone);
            }
            if (zone.children && deviceSettings.sub_zones && deviceSettings.sub_zones.clazz) {
                zones.push(...zone.children);
            }
            const devices = this.devicesObj.getDevicesFromZones(zones, DeviceClass.fan);
            if (devices) {
                dcs.push(...devices);
            }
        }
        return dcs;
    }

}
