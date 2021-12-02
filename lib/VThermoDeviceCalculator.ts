import {
    CalcMethod,
    CAPABILITY_ACTIVE,
    Device,
    DeviceCapability,
    DeviceClass,
    DeviceRequest,
    DeviceRequests,
    DeviceSettings,
    TemperatureSettings,
    TemperatureSettingsZone,
    Zone
} from "./types";
import {DeviceCalculator} from "./DeviceCalculator";
import {Zones} from "./Zones";

const math = require('./math');

export class VThermoDeviceCalculator extends DeviceCalculator {

    calculate(zone: Zone): DeviceRequests {
        const requests = new DeviceRequests();
        const devices = this.devicesObj.getDevicesFromZones(zone, DeviceClass.vthermo);
        if (devices && devices.length > 0) {
            this.logger?.silly(`Will calculate ${zone.name} with ${devices.length} VThermos`);
            for (const device of devices) {
                requests.addRequest(this.calculateMeasureTemperature(device, zone));
                requests.addRequests(this.calculateTargetTemperatures(device, zone));
                requests.addRequests(this.calculateHeaterSwitching(device, zone));
            }
        }
        return requests;
    }

    /**
     * Get temperatures in a zone or list of zones.
     * @param zone a zone or a list of zones
     * @param tempSettings temperature settings
     */
    getTemperaturesInZone(zone: Zone | Zone[] | undefined, tempSettings?: TemperatureSettingsZone): DeviceCapability[] {
        const dcs: DeviceCapability[] = [];
        if (zone && tempSettings) {
            const zones = Array.isArray(zone) ? zone : [zone];
            for (const z of zones) {
                const devices = this.devicesObj.getDevicesFromZones(zones);
                const temperatures = devices
                    ?.filter(d => tempSettings.sensor && (d.class === 'sensor') ||
                        tempSettings.thermostat && (d.class === 'thermostat') && !d.isVThermo() ||
                        tempSettings.vthermo && d.isVThermo() ||
                        tempSettings.other && (d.class !== 'sensor') && d.class !== 'thermostat')
                    .filter(d => d.capabilitiesObj && d.capabilitiesObj.has('measure_temperature'))
                    .map(d => d.capabilitiesObj && d.capabilitiesObj?.get('measure_temperature'));
                if (temperatures) {
                    // @ts-ignore
                    dcs.push(...temperatures);
                }
            }
        }
        return dcs;
    }

    /**
     * Get temperatures for a zone, with parent zone, current zone and children zones.
     * @param zone the zone
     * @param zonesObj zone manager
     * @param temperatureSettings temperature settings
     */
    getTemperatures(zone: Zone | undefined, zonesObj: Zones, temperatureSettings: TemperatureSettings | undefined): DeviceCapability[] {
        const dcs: DeviceCapability[] = [];
        if (zone && temperatureSettings) {
            const parent = zone.parent ? zonesObj.getZone(zone.parent) : undefined;
            dcs.push(...this.getTemperaturesInZone(zone, temperatureSettings.zone));
            dcs.push(...this.getTemperaturesInZone(parent, temperatureSettings.parent));
            dcs.push(...this.getTemperaturesInZone(zone.children, temperatureSettings.children));
        }
        return dcs;
    }

    /**
     * Calculate measure temperature for a VThermo.
     * @param device
     * @param zone
     */
    calculateMeasureTemperature(device: Device, zone: Zone): DeviceRequest | undefined {
        const temperatureSettings = device.temperatureSettings;
        const temps = this.getTemperatures(zone, this.zonesObj, temperatureSettings);
        if (temps.length > 0) {
            this.logger?.debug(`Got temperatures for VThermo: ${zone.name} - ${device.id} - ${device.name}`, temps);
        }
        const validatedTemps = this.validateTemperatures(temps, temperatureSettings);
        const temperature = this.calculateTemperature(validatedTemps, temperatureSettings);
        return this.updateAndCreateDeviceRequestIfChanged(device, 'measure_temperature', temperature);
    }

    private validateTemperatures(temperatures: DeviceCapability[], temperatureSettings: TemperatureSettings | undefined): DeviceCapability[] {
        if (temperatureSettings && temperatureSettings.validate && temperatureSettings.validate_min !== undefined && temperatureSettings.validate_max !== undefined) {
            const dcs: DeviceCapability[] = [];
            for (const t of temperatures) {
                if (t.value >= temperatureSettings.validate_min && t.value <= temperatureSettings.validate_max) {
                    dcs.push(t);
                }
            }
            if (temperatures.length !== dcs.length) {
                this.logger?.verbose(`Validated temperatures: Got ${temperatures.length} temperatures, returned ${dcs.length} temperatures:`, temperatures, dcs);
            }
            return dcs;
        }
        return temperatures;
    }

    private calculateTemperature(temperatures: DeviceCapability[], tempSettings?: TemperatureSettings): number | null | undefined {
        let temperature = null;
        if (temperatures.length > 0 && tempSettings) {
            if (tempSettings.calcMethod === CalcMethod.AVERAGE) {
                temperature = math.round(math.average(temperatures));
            } else if (tempSettings.calcMethod === CalcMethod.MIN) {
                temperature = math.min(temperatures);
            } else if (tempSettings.calcMethod === CalcMethod.MAX) {
                temperature = math.max(temperatures);
            } else if (tempSettings.calcMethod === CalcMethod.NEWEST) {
                temperature = math.newest(temperatures);
            } else if (tempSettings.calcMethod === CalcMethod.MANUAL) {
                temperature = undefined;
            } else {
                this.logger?.error('calculateTemperature: unsupported calc method', tempSettings.calcMethod);
            }
        }
        return temperature;
    }

    /**
     * Calculate target temperature for other devices (updating from VThermo to device),
     * and for the VThermo (updating from a thermostat in the same zone).,
     * @param device
     * @param zone
     */
    calculateTargetTemperatures(device: Device, zone: Zone): DeviceRequests {
        const requests = new DeviceRequests();

        const targetSettings = device.targetSettings;
        if (!targetSettings) {
            this.logger?.warn(`No target temperature settings: ${device.id} ${device.name}`);
            return requests;
        }

        if (targetSettings.zone?.from_other) {
            const otherThermostatsInZone = this.devicesObj.getDevicesFromZones(zone, DeviceClass.thermostat);
            if (otherThermostatsInZone && otherThermostatsInZone.length > 0) {
                // Just support the first thermostat found..
                const toTargetTemperature: DeviceCapability | undefined = otherThermostatsInZone[0].getLocalCapabilityValue('target_temperature');
                if (toTargetTemperature) {
                    const targetTemp = this.calculateTargetTemperature(device, toTargetTemperature.value);
                    const dr = this.updateAndCreateDeviceRequestIfChanged(device, 'target_temperature', targetTemp);
                    requests.addRequest(dr);
                }
            }
        }

        const targetTemperature: DeviceCapability | undefined = device.getLocalCapabilityValue('target_temperature');
        if (!targetTemperature) {
            this.logger?.warn(`No target temperature for VThermo: ${device.id} ${device.name}`);
            return requests;
        }

        const childrenZoneIds = zone.children?.map(z => z.id);
        const otherZoneIds = this.zonesObj.getZonesAsList(zone)
            .map(z => z.id)
            .filter(id => (id !== zone.id) && (!childrenZoneIds || !childrenZoneIds.includes(id)));

        const thermostats = this.devicesObj.getDevices()
            ?.filter(d => d.id !== device.id &&
                !!d.zone &&
                !!d.driverId && (
                    (targetSettings.zone?.to_other && zone.id === d.zone && !d.isVThermo() && !d.isVHumidity())
                    || (targetSettings.sub_zones?.to_vthermo && !!childrenZoneIds && childrenZoneIds.includes(d.zone) && d.isVThermo())
                    || (targetSettings.sub_zones?.to_other && !!childrenZoneIds && childrenZoneIds.includes(d.zone) && !d.isVThermo() && !d.isVHumidity())
                    || (targetSettings.all_sub_zones?.to_vthermo && !!otherZoneIds && otherZoneIds.includes(d.zone) && d.isVThermo())
                    || (targetSettings.all_sub_zones?.to_other && !!otherZoneIds && otherZoneIds.includes(d.zone) && !d.isVThermo() && !d.isVHumidity())
                ));

        if (thermostats) {
            for (const thermostat of thermostats) {
                const targetTemp = this.calculateTargetTemperature(thermostat, targetTemperature.value);
                const targetUpdateEnabled = !thermostat.isVThermo() ||
                    thermostat.targetSettings && !!thermostat.targetSettings.target_update_enabled;

                if (targetUpdateEnabled) {
                    const dr = this.updateAndCreateDeviceRequestIfChanged(thermostat, 'target_temperature', targetTemp);
                    requests.addRequest(dr);
                }
            }
        }

        return requests;
    }

    calculateTargetTemperature(thermostat: Device, targetTemperature: number): number {
        let targetTemp = targetTemperature;
        if (thermostat.isVThermo() && thermostat.targetSettings) {
            if (thermostat.targetSettings.offset) {
                targetTemp += thermostat.targetSettings.offset;
            }
            if (thermostat.targetSettings.min && targetTemp < thermostat.targetSettings.min) {
                targetTemp = thermostat.targetSettings.min;
            } else if (thermostat.targetSettings.max && targetTemp > thermostat.targetSettings.max) {
                targetTemp = thermostat.targetSettings.max;
            }
        }
        return targetTemp;
    }

    /**
     * Calculate if the VThermo, heaters and thermostats in the zone and sub zone (one level down) should be switched.
     * @param device
     * @param zone
     * @private
     */
    calculateHeaterSwitching(device: Device, zone: Zone): DeviceRequests {
        const requests = new DeviceRequests();

        const deviceSettings = device.deviceSettings;
        if (!deviceSettings) {
            return requests;
        }

        const targetTemperature = device.getLocalCapabilityValue('target_temperature');
        if (!targetTemperature || targetTemperature.value === undefined || targetTemperature.value === null) {
            return requests;
        }

        const temperature = device.getLocalCapabilityValue('measure_temperature');
        if (!temperature || temperature.value === undefined || temperature.value === null) {
            return requests;
        }

        const contactAlarm = deviceSettings.contactAlarm && this.devicesObj.hasContactAlarm(zone);
        const motionAlarm = deviceSettings.motionAlarm && this.devicesObj.hasMotionAlarm(zone);

        const onoff = this.resolveOnOff(device, temperature.value, targetTemperature.value, contactAlarm, motionAlarm);

        if (onoff !== undefined) {
            const dr = this.updateAndCreateDeviceRequestIfChanged(device, CAPABILITY_ACTIVE, onoff);
            if (dr) {
                dr.trigger = `vt_onoff_${dr.value ? 'true' : 'false'}`;
            }
            requests.addRequest(dr);

            this.heatersDeviceRequests(onoff, zone, deviceSettings, requests);
            this.thermostatsDeviceRequests(onoff, zone, deviceSettings, requests);
        }

        return requests;
    }

    /**
     * Device requests for switching heaters.
     * @param onoff
     * @param zone
     * @param deviceSettings
     * @param requests
     * @private
     */
    private heatersDeviceRequests(onoff: boolean, zone: Zone, deviceSettings: DeviceSettings, requests: DeviceRequests) {
        const heaters = this.getHeaters(zone, this.zonesObj, deviceSettings);
        for (const heater of heaters) {
            const dr = this.updateAndCreateDeviceRequestIfChanged(heater, 'onoff', onoff);
            if (dr && deviceSettings.deviceDelay && deviceSettings.deviceDelay > 0) {
                dr.deviceDelay = deviceSettings.deviceDelay;
            }
            requests.addRequest(dr);
        }
    }

    /**
     * Device requests for setting the target temperature to simulate switching thermostats on / off.
     * @param onoff
     * @param zone
     * @param deviceSettings
     * @param requests
     * @private
     */
    private thermostatsDeviceRequests(onoff: boolean, zone: Zone, deviceSettings: DeviceSettings, requests: DeviceRequests) {
        const thermostats = this.getThermostats(zone, this.zonesObj, deviceSettings);
        for (const thermostat of thermostats) {
            const thTargetTemperature = thermostat.getLocalCapabilityValue('target_temperature');
            const thTemperature = thermostat.getLocalCapabilityValue('measure_temperature');

            const THERMOSTAT_ONOFF = 2.0;
            const MIN_THERMOSTAT_ONOFF = 0.25;

            if (thTargetTemperature && thTargetTemperature.value &&
                thTemperature && thTemperature.value) {
                let newTargetTemperature;
                if (onoff && (thTargetTemperature.value < thTemperature.value + MIN_THERMOSTAT_ONOFF)) {
                    newTargetTemperature = Math.ceil(thTemperature.value + THERMOSTAT_ONOFF);
                } else if (!onoff && (thTargetTemperature.value > thTemperature.value - MIN_THERMOSTAT_ONOFF)) {
                    newTargetTemperature = Math.floor(thTemperature.value - THERMOSTAT_ONOFF);
                }
                if (newTargetTemperature) {
                    const dr = this.updateAndCreateDeviceRequestIfChanged(thermostat, 'target_temperature', newTargetTemperature);
                    if (dr && deviceSettings.deviceDelay && deviceSettings.deviceDelay > 0) {
                        dr.deviceDelay = deviceSettings.deviceDelay;
                    }
                    requests.addRequest(dr);
                }
            }
        }
    }

    /**
     * Resolve if the VThermo should be on or off.
     * @param device
     * @param temperature
     * @param targetTemperature
     * @param contactAlarm
     * @param motionAlarm
     */
    resolveOnOff(device: Device, temperature: number, targetTemperature: number, contactAlarm?: boolean, motionAlarm?: boolean): boolean | undefined {
        const deviceSettings = device.deviceSettings;
        if (!deviceSettings) {
            this.logger?.error('No device settings');
            return;
        }
        if (!device.isVThermo()) {
            this.logger?.error('Unable to resolve on / off.  Unsupported device', device);
            return;
        }

        const currentOnoff = device.getLocalCapabilityValue('onoff').value;
        const currentVtOnoff = device.getLocalCapabilityValue(CAPABILITY_ACTIVE).value;

        const mainOnoff = deviceSettings.onoffEnabled ? currentOnoff : true;

        let onoff = undefined;
        if (contactAlarm || !mainOnoff) {
            onoff = currentVtOnoff === true ? false : undefined;
        } else if (motionAlarm) {
            onoff = true;
        } else {
            const hysteresis = deviceSettings.hysteresis || 0.5;
            const invert = deviceSettings.invert;
            if (temperature > (targetTemperature + hysteresis)) {
                onoff = invert === true;
            } else if (temperature < (targetTemperature - hysteresis)) {
                onoff = invert !== true;
            }
        }

        return onoff;
    }

    /**
     * Get heaters for a zone, with current zone and children zones.
     * @param zone the zone
     * @param zonesObj zone manager
     * @param deviceSettings device settings
     */
    getHeaters(zone: Zone, zonesObj: Zones, deviceSettings?: DeviceSettings): Device[] {
        const dcs: Device[] = [];
        if (deviceSettings) {
            const zones = [];
            if (deviceSettings.zone && deviceSettings.zone.clazz) {
                zones.push(zone);
            }
            if (zone.children && deviceSettings.sub_zones && deviceSettings.sub_zones.clazz) {
                zones.push(...zone.children);
            }
            const devices = this.devicesObj.getDevicesFromZones(zones, DeviceClass.heater);
            if (devices) {
                dcs.push(...devices);
            }
        }
        return dcs;
    }

    /**
     * Get thermostats for a zone, with current zone and children zones.
     * @param zone the zone
     * @param zonesObj zone manager
     * @param deviceSettings device settings
     */
    getThermostats(zone: Zone, zonesObj: Zones, deviceSettings?: DeviceSettings): Device[] {
        const dcs: Device[] = [];
        if (deviceSettings && (
            deviceSettings.zone && deviceSettings.zone.thermostats
            || deviceSettings.sub_zones && deviceSettings.sub_zones.thermostats)) {
            const zones = [];
            if (deviceSettings.zone && deviceSettings.zone.thermostats) {
                zones.push(zone);
            }
            if (zone.children && deviceSettings.sub_zones && deviceSettings.sub_zones.thermostats) {
                zones.push(...zone.children);
            }
            const devices = this.devicesObj.getDevicesFromZones(zones, DeviceClass.thermostat);
            if (devices) {
                dcs.push(...devices);
            }
        }
        return dcs;
    }
}
