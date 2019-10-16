'use strict';

const Homey = require('homey'),
    devicesLib = require('../../lib/devices'),
    temperatureLib = require('../../lib/temperature');

class VThermoDevice extends Homey.Device {

    async onInit() {
        this.log('virtual device initialized');

        this._turnedOnTrigger = new Homey.FlowCardTriggerDevice('vt_onoff_true');
        this._turnedOnTrigger
            .register();

        this._turnedOffTrigger = new Homey.FlowCardTriggerDevice('vt_onoff_false');
        this._turnedOffTrigger
            .register();

        new Homey.FlowCardCondition('vt_onoff_is_on')
            .register()
            .registerRunListener((args, state) => args.device.getCapabilityValue('vt_onoff'));

        if (this.hasCapability('onoff')) {
            this.registerCapabilityListener('onoff', async (value, opts) => {
                return this.checkTemp({onoff: value});
            });
        }

        this.registerCapabilityListener('target_temperature', async (value, opts) => {
            return this.checkTemp({target_temperature: value});
        });

        this.checkAvailable();
        this.checkTemp();
    }

    async onAdded() {
        this.log('virtual device added:', this.getData().id);
        await this.setCapabilityValue('onoff', true);
    }

    onDeleted() {
        this.clearCheckAvailable();
        this.clearCheckTime();
        this.log('virtual device deleted');
    }

    clearCheckAvailable() {
        if (this.curCheckAvailableTimeout) {
            clearTimeout(this.curCheckAvailableTimeout);
            this.curCheckAvailableTimeout = undefined;
        }
    }

    scheduleCheckAvailable() {
        this.clearCheckAvailable();
        this.curCheckAvailableTimeout = setTimeout(this.checkAvailable.bind(this), 15000);
    }

    async checkAvailable() {
        this.log(`checkAvailable 1: ${this.getAvailable()}`);
        await this.setAvailable();
        this.log(`checkAvailable 2: ${this.getAvailable()}`);
        this.scheduleCheckAvailable();
    }

    clearCheckTime() {
        if (this.curTimeout) {
            clearTimeout(this.curTimeout);
            this.curTimeout = undefined;
        }
    }

    scheduleCheckTemp(seconds = 60) {
        this.clearCheckTime();
        this.log(`Checking temp in ${seconds} seconds`);
        this.curTimeout = setTimeout(this.checkTemp.bind(this), seconds * 1000);
    }

    async checkTemp(opts) {
        this.clearCheckTime();

        let devices = await devicesLib.getDevices(this);
        if (!devices) {
            this.scheduleCheckTemp();
            return Promise.resolve();
        }

        let device = devicesLib.getDeviceByDeviceId(this.getData().id, devices);
        if (!device) {
            this.scheduleCheckTemp();
            return Promise.resolve();
        }
        let zoneId = device.zone;

        let targetTemp = temperatureLib.findTargetTemperature(this, opts);
        if (targetTemp === undefined || targetTemp === null) {
            this.scheduleCheckTemp();
            return Promise.resolve();
        }

        let temperature = await temperatureLib.findTemperature(this, zoneId, devices);
        if (temperature === undefined || temperature === null) {
            this.scheduleCheckTemp();
            return Promise.resolve();
        }

        let contactAlarm = temperatureLib.hasContactAlarm(this, zoneId, devices, this.getSettings());
        let onoff = temperatureLib.resolveOnoff(this, temperature, targetTemp, this.getSettings(), opts, contactAlarm);

        await temperatureLib.switchHeaterDevices(this, zoneId, devices, onoff);

        this.scheduleCheckTemp();
        return Promise.resolve();
    }

}

module.exports = VThermoDevice;