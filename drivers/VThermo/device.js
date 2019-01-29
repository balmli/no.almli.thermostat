'use strict';

const Homey = require('homey'),
    devicesLib = require('../../lib/devices'),
    temperatureLib = require('../../lib/temperature');

class VThermoDevice extends Homey.Device {

    onInit() {
        this.log('virtual device initialized');

        this._turnedOnTrigger = new Homey.FlowCardTriggerDevice('vt_onoff_true');
        this._turnedOnTrigger
            .register();

        this._turnedOffTrigger = new Homey.FlowCardTriggerDevice('vt_onoff_false');
        this._turnedOffTrigger
            .register();

        this._onoffCondition = new Homey.FlowCardCondition('vt_onoff_is_on')
            .register()
            .registerRunListener((args, state) => args.device.getCapabilityValue('vt_onoff'));

        this.registerCapabilityListener('target_temperature', (value, opts) => {
            return this.checkTemp({target_temperature: value});
        });

        this.checkTemp();
    }

    onAdded() {
        this.log('virtual device added:', this.getData().id);
    }

    onDeleted() {
        this.log('virtual device deleted');
    }

    clearCheckTime() {
        if (this.curTimeout) {
            clearTimeout(this.curTimeout);
            this.curTimeout = undefined;
        }
    }

    scheduleCheckTemp(seconds) {
        this.clearCheckTime();
        this.log(`Checking temp in ${seconds} seconds`);
        this.curTimeout = setTimeout(this.checkTemp.bind(this), seconds * 1000);
    }

    async checkTemp(opts) {
        this.clearCheckTime();

        let devices = await devicesLib.getDevices(this);
        if (!devices) {
            this.scheduleCheckTemp(60);
            return Promise.resolve();
        }

        let zoneId = devicesLib.getDeviceByDeviceId(this.getData().id, devices).zone;
        let settings = this.getSettings();
        let hysteresis = settings.hysteresis || 0.5;

        let targetTemp = temperatureLib.findTargetTemperature(this, opts);
        if (targetTemp === undefined || targetTemp === null) {
            this.scheduleCheckTemp(60);
            return Promise.resolve();
        }

        let temperature = temperatureLib.findTemperature(this, zoneId, devices);
        if (temperature === undefined || temperature === null) {
            this.scheduleCheckTemp(60);
            return Promise.resolve();
        }

        let onoff = undefined;
        if (temperature > (targetTemp + hysteresis)) {
            onoff = false;
        } else if (temperature < (targetTemp - hysteresis)) {
            onoff = true;
        }

        temperatureLib.switchHeaterDevices(this, zoneId, devices, onoff);

        this.scheduleCheckTemp(60);
        return Promise.resolve();
    }

}

module.exports = VThermoDevice;