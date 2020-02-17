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
                return this.handleCheckTemp({ onoff: value });
            });
        }

        this.registerCapabilityListener('target_temperature', async (value, opts) => {
            return this.handleCheckTemp({ target_temperature: value });
        });

        this.checkAvailable();
    }

    async onAdded() {
        this.log('virtual device added:', this.getData().id);
        await this.setCapabilityValue('onoff', true);
    }

    onDeleted() {
        this.clearCheckAvailable();
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
        this.curCheckAvailableTimeout = setTimeout(this.checkAvailable.bind(this), 180000);
    }

    async checkAvailable() {
        if (this.getAvailable() !== true) {
            this.log(`checkAvailable: ${this.getAvailable()}`);
        }
        await this.setAvailable();
        this.scheduleCheckAvailable();
    }

    async handleCheckTemp(opts) {
        this._devices = await devicesLib.getDevices(this);
        await this.checkTemp(opts);
    }

    async checkTemp(opts) {
        if (!this._devices) {
            return;
        }

        let device = devicesLib.getDeviceByDeviceId(this.getData().id, this._devices);
        if (!device) {
            return;
        }
        let zoneId = device.zone;

        let temperature = await temperatureLib.findTemperature(this, zoneId, this._devices, this.getSettings());
        if (temperature === undefined || temperature === null) {
            return;
        }

        let targetTemp = temperatureLib.findTargetTemperature(this, opts);
        if (targetTemp === undefined || targetTemp === null) {
            return;
        }

        let contactAlarm = temperatureLib.hasContactAlarm(this, zoneId, this._devices, this.getSettings());
        let onoff = temperatureLib.resolveOnoff(this, temperature, targetTemp, this.getSettings(), opts, contactAlarm);

        await temperatureLib.switchHeaterDevices(this, zoneId, this._devices, onoff, this.getSettings());
    }

}

module.exports = VThermoDevice;