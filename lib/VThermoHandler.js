'use strict';

const Homey = require('homey');
const BaseHandler = require('./BaseHandler');
const constants = require('./constants');
const math = require('./math');

module.exports = class VThermoHandler extends BaseHandler {

    constructor(options) {
        super(options, 'heater', Homey.app._turnedOnTriggerVThermo, Homey.app._turnedOffTriggerVThermo);
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
        const temperatures = this._getTemperatures(node.zone, tempSettings);
        const temperature = this._calcTemperature(temperatures, tempSettings);
        this._updateMeasureTemperature(deviceId, device, node, tempSettings, temperature);
    }

    _getTemperatures(zone, tempSettings) {
        const temperatures = [];
        temperatures.push(...this._deviceHandler.getTemperatures(zone, tempSettings.zone));
        temperatures.push(...this._deviceHandler.getTemperatures(this._deviceHandler.getParentZone(zone), tempSettings.parent));
        temperatures.push(...this._deviceHandler.getTemperatures(this._deviceHandler.getChildrenZones(zone), tempSettings.children));
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

        const onoff = this._resolveOnOff(device, node, targetTemp, temperature);

        if (onoff !== undefined) {
            await this._switch(device, node, onoff);
        }
    }

    _resolveOnOff(device, node, targetTemp, temperature, contactAlarm) {
        const settings = device.getSettings();

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
