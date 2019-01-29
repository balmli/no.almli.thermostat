'use strict';

const Homey = require('homey'),
    devicesLib = require('../../lib/devices'),
    humidityLib = require('../../lib/humidity');

class VHumidityDevice extends Homey.Device {

    onInit() {
        this.log('virtual device initialized');

        this._humidityChangedTrigger = new Homey.FlowCardTriggerDevice('vh_humidity_changed');
        this._humidityChangedTrigger
            .register();

        this._targetHumidityChangedTrigger = new Homey.FlowCardTriggerDevice('vh_target_humidity_changed');
        this._targetHumidityChangedTrigger
            .register();

        this._turnedOnTrigger = new Homey.FlowCardTriggerDevice('vh_onoff_true');
        this._turnedOnTrigger
            .register();

        this._turnedOffTrigger = new Homey.FlowCardTriggerDevice('vh_onoff_false');
        this._turnedOffTrigger
            .register();

        this._onoffCondition = new Homey.FlowCardCondition('vh_onoff_is_on')
            .register()
            .registerRunListener((args, state) => args.device.getCapabilityValue('vt_onoff'));

        this._setTargetHumidityAction = new Homey.FlowCardAction('vh_set_target_humidity')
            .register()
            .registerRunListener((args, state) => {
                args.device.setCapabilityValue('vh_target_humidity', args.vh_target_humidity).catch(console.error);
                return this.checkHumidity({vh_target_humidity: args.vh_target_humidity});
            });

        this.registerCapabilityListener('vh_target_humidity', (value, opts) => {
            this._targetHumidityChangedTrigger.trigger(this, {
                humidity: value
            });
            return this.checkHumidity({vh_target_humidity: value});
        });

        this.checkHumidity();
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

    scheduleCheckHumidity(seconds) {
        this.clearCheckTime();
        this.log(`Checking humidity in ${seconds} seconds`);
        this.curTimeout = setTimeout(this.checkHumidity.bind(this), seconds * 1000);
    }

    async checkHumidity(opts) {
        this.clearCheckTime();

        let devices = await devicesLib.getDevices(this);
        if (!devices) {
            this.scheduleCheckHumidity(60);
            return Promise.resolve();
        }

        let zoneId = devicesLib.getDeviceByDeviceId(this.getData().id, devices).zone;
        let settings = this.getSettings();
        let hysteresis = settings.hysteresis || 1;

        let targetHumidity = humidityLib.findTargetHumidity(this, opts);
        if (targetHumidity === undefined || targetHumidity === null) {
            this.scheduleCheckHumidity(60);
            return Promise.resolve();
        }

        let humidity = humidityLib.findHumidity(this, zoneId, devices);
        if (humidity === undefined || humidity === null) {
            this.scheduleCheckHumidity(60);
            return Promise.resolve();
        }

        let onoff = undefined;
        if (humidity > (targetHumidity + hysteresis)) {
            onoff = true;
        } else if (humidity < (targetHumidity - hysteresis)) {
            onoff = false;
        }

        humidityLib.switchFanDevices(this, zoneId, devices, onoff);

        this.scheduleCheckHumidity(60);
        return Promise.resolve();
    }

}

module.exports = VHumidityDevice;