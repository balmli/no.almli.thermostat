'use strict';

const Homey = require('homey');
const BaseHandler = require('./BaseHandler');
const constants = require('./constants');
const math = require('./math');

module.exports = class VHumidityHandler extends BaseHandler {

    constructor(options) {
        super(options, 'fan', Homey.app._turnedOnTriggerVHumidity, Homey.app._turnedOffTriggerVHumidity);
    }

    async onCapability(event) {
        if (event.capId === 'onoff') {
            return (await this._onOnOff(event));
        } else if (event.capId === 'measure_humidity') {
            return (await this._onMeasureHumidity(event));
        } else if (event.capId === 'vh_target_humidity') {
            return (await this._onTargetHumidity(event));
        }
    }

    async _onMeasureHumidity(event) {
        if (this.getDevice(event.id)) {
            // avoid loop
            return;
        }
        this.calculateAllDevices();
        await this.switchDevices();
    }

    async _onTargetHumidity(event) {
        const device = this.getDevice(event.id);
        if (device) {
            await this.switchDevice(device);
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
        const humSettings = device.getHumiditySettings();
        const humidities = this._getHumidities(node.zone, humSettings);
        const humidity = this._calcHumidity(humidities, humSettings);
        this._updateMeasureHumidity(deviceId, device, node, humSettings, humidity);
    }

    _getHumidities(zone, humSettings) {
        const humidities = [];
        humidities.push(...this._deviceHandler.getHumidities(zone));
        return humidities;
    }

    _calcHumidity(humidities, humSettings) {
        let humidity = null;
        if (humidities.length > 0) {
            if (humSettings.calcMethod === constants.CALC_METHODS.AVERAGE) {
                humidity = math.round(math.average(humidities));
            } else if (humSettings.calcMethod === constants.CALC_METHODS.MIN) {
                humidity = math.min(humidities);
            } else if (humSettings.calcMethod === constants.CALC_METHODS.MAX) {
                humidity = math.max(humidities);
            } else {
                this.error('_calcHumidity: unsupported calc method', humSettings.calcMethod);
            }
        }
        return humidity;
    }

    _updateMeasureHumidity(deviceId, device, node, humSettings, humidity) {
        const curValue = node.capabilitiesObj['measure_humidity'].value;
        if (curValue !== humidity || humidity === null) {
            const zone = this._deviceHandler.getZone(node.zone);
            device.log(`"${zone ? zone.name: ''}:${node.name}:measure_humidity" => ${humidity} (${humSettings.calcMethod})`);
            this._deviceHandler._storeValue(deviceId, 'measure_humidity', humidity);

            device.setCapabilityValue('measure_humidity', humidity)
                .catch(err => device.error(`update measure_humidity failed for ${node.id}`, err));

            if (humidity || humidity === 0) {
                if (device._humidityStore) {
                    device._humidityStore.addValue(humidity);
                }
                Homey.app._humidityChangedTrigger.trigger(device, {
                    humidity: humidity
                });
                device.log(`Trigger: "${node.name}" => humidity changed`);
            }
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

        const targetHumidity = node.capabilitiesObj['vh_target_humidity'].value;
        if (targetHumidity === undefined || targetHumidity === null) {
            device.log('switchDevice: cannot switch.  No target humidity has been set');
            return;
        }

        const humidity = node.capabilitiesObj['measure_humidity'].value;
        if (humidity === undefined || humidity === null) {
            device.log('switchDevice: cannot switch.  No humidity');
            return;
        }

        const onoff = this._resolveOnOff(device, node, targetHumidity, humidity);

        if (onoff !== undefined) {
            await this._switch(device, node, onoff);
        }
    }

    _resolveOnOff(device, node, targetHumidity, humidity) {
        const settings = device.getSettings();

        let mainOnoff = settings.onoff_enabled ? node.capabilitiesObj['onoff'].value : true;

        let onoff = undefined;
        if (!mainOnoff) {
            onoff = node.capabilitiesObj['vt_onoff'].value === true ? false : undefined;
        } else {
            let hysteresis = settings.hysteresis || 1;
            let invert = settings.invert;
            if (humidity > (targetHumidity + hysteresis)) {
                onoff = invert !== true;
            } else if (humidity < (targetHumidity - hysteresis)) {
                onoff = invert === true;
            }
        }

        return onoff;
    }

};
