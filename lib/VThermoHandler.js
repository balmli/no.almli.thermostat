'use strict';

const Homey = require('homey');
const BaseHandler = require('./BaseHandler');
const constants = require('./constants');
const math = require('./math');

module.exports = class VThermoHandler extends BaseHandler {

    constructor(options) {
        super(options, 'heater', Homey.app._turnedOnTriggerVThermo, Homey.app._turnedOffTriggerVThermo);
    }

    async onCapability(event) {
        if (event.capId === 'onoff') {
            return (await this._onOnOff(event));
        } else if (event.capId === 'measure_temperature') {
            return (await this._onMeasureTemperature(event));
        } else if (event.capId === 'target_temperature') {
            return (await this._onTargetTemperature(event));
        } else if (event.capId === 'alarm_contact') {
            return (await this._onAlarmContact(event));
        }
    }

    async _onMeasureTemperature(event) {
        if (this.getDevice(event.id)) {
            // avoid loop
            return;
        }
        this.calculateAllDevices();
        await this.switchDevices();
    }

    async _onTargetTemperature(event) {
        const device = this.getDevice(event.id);
        if (device) {
            await this._updateTargetTemperatures(event, device);
            await this.switchDevice(device);
        } else {
            this._updateTargetFromOtherInSameZone(event);
        }
    }

    _updateTargetTemperatures(event, device) {
        const targetSettings = device.getTargetSettings();
        if (targetSettings.zone.to_other ||
            targetSettings.sub_zones.to_vthermo ||
            targetSettings.sub_zones.to_other ||
            targetSettings.all_sub_zones.to_vthermo ||
            targetSettings.all_sub_zones.to_other) {
            const node = this._deviceHandler.getDevice(event.id);
            if (node) {
                const childrenZones = this._deviceHandler.getChildrenZones(node.zone);

                const thermos = this._deviceHandler.getDevicesInZoneAndSubZones(node.zone)
                    .filter(aNode => this._filterForTargetTemperatureUpdate(node, aNode, childrenZones, targetSettings));

                for (let thermoNode of thermos) {
                    const thermoDevice = thermoNode.device;
                    if (!thermoDevice) {
                        this.log(`_updateTargetTemperatures: missing node.device for ${thermoNode.id}`);
                        return;
                    }
                    if (!thermoDevice.capabilitiesObj['target_temperature']) {
                        this.log(`_updateTargetTemperatures: skip ${thermoNode.id} ${thermoNode.name} -> no target_temperature capability`);
                        return;
                    }

                    let targetTemperature = event.value;

                    const vThermoDevice = this.getDevice(thermoNode.id);
                    if (vThermoDevice) {
                        const targetSettingsVThermo = vThermoDevice.getTargetSettings();
                        targetTemperature += targetSettingsVThermo.offset;
                        if (targetTemperature < targetSettingsVThermo.min) {
                            targetTemperature = targetSettingsVThermo.min;
                        } else if (targetTemperature > targetSettingsVThermo.max) {
                            targetTemperature = targetSettingsVThermo.max;
                        }
                    }

                    thermoDevice.setCapabilityValue('target_temperature', targetTemperature)
                        .then(() => this.log(`Updated: "${thermoNode.name}": target temperature set to ${targetTemperature} from ${node.name}`))
                        .catch(err => this.log(`Update: "${thermoNode.name}": FAILED`, err));
                }
            }
        }
    }

    _filterForTargetTemperatureUpdate(masterNode, node, childrenZones, targetSettings) {
        return node.class === 'thermostat' && (
            targetSettings.zone.to_other && masterNode.zone === node.zone && !constants.SUPPORTED_DRIVERS.includes(node.driverId) ||
            targetSettings.sub_zones.to_vthermo && childrenZones.includes(node.zone) && node.driverId === constants.DRIVER_VTHERMO ||
            targetSettings.sub_zones.to_other && childrenZones.includes(node.zone) && !constants.SUPPORTED_DRIVERS.includes(node.driverId) ||
            targetSettings.all_sub_zones.to_vthermo && masterNode.zone !== node.zone && !childrenZones.includes(node.zone) && node.driverId === constants.DRIVER_VTHERMO ||
            targetSettings.all_sub_zones.to_other && masterNode.zone !== node.zone && !childrenZones.includes(node.zone) && !constants.SUPPORTED_DRIVERS.includes(aNode.driverId)
        );
    }

    _updateTargetFromOtherInSameZone(event) {
        const node = this._deviceHandler.getDevice(event.id);
        if (node) {
            const vThermosInZone = this._deviceHandler.getDevicesInZone(node.zone)
                .filter(node => node.driverId === constants.DRIVER_VTHERMO);
            for (let vThermoNode of vThermosInZone) {
                const vThermoDevice = this.getDevice(vThermoNode.id);
                if (vThermoDevice) {
                    const targetSettings = vThermoDevice.getTargetSettings();
                    if (targetSettings.zone.from_other) {
                        vThermoDevice.setCapabilityValue('target_temperature', event.value)
                            .then(() => this.log(`Updated: "${vThermoNode.name}": target temperature set to ${event.value} from ${node.name}`))
                            .catch(err => this.log(`Update: "${vThermoNode.name}": FAILED`, err));
                    }
                }
            }
        }
    }

    async _onAlarmContact(event) {
        const node = this._deviceHandler.getDevice(event.id);
        if (node) {
            const vThermosInZone = this._deviceHandler.getDevicesInZone(node.zone)
                .filter(node => node.driverId === constants.DRIVER_VTHERMO);
            for (let vThermoNode of vThermosInZone) {
                const vThermoDevice = this.getDevice(vThermoNode.id);
                if (vThermoDevice && vThermoDevice.getSetting('contact_alarm')) {
                    await this.switchDevice(vThermoDevice);
                }
            }
        }
    }

    async calculateDevice(deviceId, device) {
        if (!deviceId || !device) {
            this.error('calculateDevice: missing device or device');
            return;
        }
        const node = this._deviceHandler.getDevice(deviceId);
        if (!node) {
            this.error('calculateDevice: missing node');
            return;
        }
        const tempSettings = device.getTemperatureSettings();
        const temperatures = this._getTemperatures(node, tempSettings);
        const temperature = this._calcTemperature(temperatures, tempSettings);
        this._updateMeasureTemperature(deviceId, device, node, tempSettings, temperature);
    }

    _getTemperatures(node, tempSettings) {
        const temperatures = [];
        temperatures.push(...this._deviceHandler.getTemperatures(node.zone, tempSettings.zone));
        temperatures.push(...this._deviceHandler.getTemperatures(this._deviceHandler.getParentZone(node.zone), tempSettings.parent));
        temperatures.push(...this._deviceHandler.getTemperatures(this._deviceHandler.getChildrenZones(node.zone), tempSettings.children));
        return temperatures;
    }

    _calcTemperature(temperatures, tempSettings) {
        let temperature = null;
        if (temperatures.length > 0) {
            if (tempSettings.calcMethod === constants.CALC_METHODS.AVERAGE) {
                temperature = math.round(math.average(temperatures));
            } else if (tempSettings.calcMethod === constants.CALC_METHODS.MIN) {
                temperature = math.min(temperatures);
            } else if (tempSettings.calcMethod === constants.CALC_METHODS.MAX) {
                temperature = math.max(temperatures);
            } else {
                this.error('_calculateTemperature: unsupported calc method', tempSettings.calcMethod);
            }
        }
        return temperature;
    }

    _updateMeasureTemperature(deviceId, device, node, tempSettings, temperature) {
        const curValue = node.capabilitiesObj['measure_temperature'].value;
        if (curValue !== temperature || temperature === null) {
            const zone = this._deviceHandler.getZone(node.zone);
            device.log(`"${zone ? zone.name: ''}:${node.name}:measure_temperature" => ${temperature} (${tempSettings.calcMethod})`);
            this._deviceHandler._storeValue(deviceId, 'measure_temperature', temperature);
            device.setCapabilityValue('measure_temperature', temperature)
                .catch(err => device.error(`update measure_temperature failed for ${node.id}`, err));
        }
    }

    async switchDevice(device) {
        if (!device) {
            this.log('switchDevice: missing device');
            return;
        }

        const node = this._deviceHandler.getDevice(device.getId());
        if (!node) {
            this.log(`switchDevice: missing node for ${device.getId()}`);
            return;
        }

        const targetTemp = node.capabilitiesObj['target_temperature'].value;
        if (targetTemp === undefined || targetTemp === null) {
            device.log('switchDevice: cannot switch.  No target temperature has been set');
            return;
        }

        const temperature = node.capabilitiesObj['measure_temperature'].value;
        if (temperature === undefined || temperature === null) {
            device.log('switchDevice: cannot switch.  No temperature');
            return;
        }

        const settings = device.getSettings();
        const contactAlarm = settings.contact_alarm && this._deviceHandler.hasContactAlarm(node.zone);
        const onoff = this._resolveOnOff(settings, node, targetTemp, temperature, contactAlarm);

        if (onoff !== undefined) {
            await this._switch(device, node, onoff);
        }
    }

    _resolveOnOff(settings, node, targetTemp, temperature, contactAlarm) {

        let mainOnoff = settings.onoff_enabled ? node.capabilitiesObj['onoff'].value : true;

        let onoff = undefined;
        if (contactAlarm || !mainOnoff) {
            onoff = node.capabilitiesObj['vt_onoff'].value === true ? false : undefined;
        } else {
            let hysteresis = settings.hysteresis || 0.5;
            let invert = settings.invert;
            if (temperature > (targetTemp + hysteresis)) {
                onoff = invert === true;
            } else if (temperature < (targetTemp - hysteresis)) {
                onoff = invert !== true;
            }
        }

        return onoff;
    }

};
