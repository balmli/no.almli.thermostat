'use strict';

const Homey = require('homey'),
    devicesLib = require('../../lib/devices'),
    humidityLib = require('../../lib/humidity'),
    ValueStore = require('../../lib/value_store');

class VHumidityDevice extends Homey.Device {

    async onInit() {
        this.log('virtual device initialized');

        try {
            if (!this.hasCapability('onoff')) {
                await this.addCapability('onoff');
                await this.setCapabilityValue('onoff', true);
            }
        } catch (err) {
            this.log('migration failed', err);
        }

        this._humidityStore = new ValueStore();

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

        new Homey.FlowCardCondition('vh_onoff_is_on')
            .register()
            .registerRunListener((args, state) => args.device.getCapabilityValue('vt_onoff'));

        new Homey.FlowCardCondition('vh_humidity_increased_last_mins')
            .register()
            .registerRunListener((args, state) => {
                if (!args.change_pct_points || !args.minutes) {
                    return false;
                }
                const changeLastMinutes = args.device._humidityStore.changePctPointsLastMinutes(args.minutes);
                return changeLastMinutes !== undefined && changeLastMinutes >= args.change_pct_points;
            });

        new Homey.FlowCardCondition('vh_humidity_decreased_last_mins')
            .register()
            .registerRunListener((args, state) => {
                if (!args.change_pct_points || !args.minutes) {
                    return false;
                }
                const changeLastMinutes = args.device._humidityStore.changePctPointsLastMinutes(args.minutes);
                return changeLastMinutes !== undefined && (-1.0 * changeLastMinutes) >= args.change_pct_points;
            });

        new Homey.FlowCardAction('vh_set_target_humidity')
            .register()
            .registerRunListener((args, state) => {
                args.device.setCapabilityValue('vh_target_humidity', args.vh_target_humidity).catch(console.error);
                return this.handleCheckHumidity({ vh_target_humidity: args.vh_target_humidity });
            });

        if (this.hasCapability('onoff')) {
            this.registerCapabilityListener('onoff', async (value, opts) => {
                if (!this.getSetting('onoff_enabled')) {
                    throw new Error('Switching the device off has been disabled');
                }
                return this.handleCheckHumidity({ onoff: value });
            });
        }

        this.registerCapabilityListener('vh_target_humidity', async (value, opts) => {
            this._targetHumidityChangedTrigger.trigger(this, {
                humidity: value
            });
            return this.handleCheckHumidity({ vh_target_humidity: value });
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

    onSettings(oldSettingsObj, newSettingsObj, changedKeysArr, callback) {
        if (changedKeysArr.includes('onoff_enabled') &&
          !newSettingsObj.onoff_enabled &&
          this.hasCapability('onoff') &&
          this.getCapabilityValue('onoff') !== true) {
            this.setCapabilityValue('onoff', true).catch(err => this.log(err));
        }
        callback(null, true);
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

    async handleCheckHumidity(opts) {
      this._devices = await devicesLib.getDevices(this);
      await this.checkHumidity(opts);
    }

    async checkHumidity(opts) {
        if (!this._devices) {
            return;
        }

        if (this.hasCapability('onoff') &&
          this.getCapabilityValue('onoff') !== true &&
          !this.getSetting('onoff_enabled')) {
            this.setCapabilityValue('onoff', true).catch(err => this.log(err));
        }

        let device = devicesLib.getDeviceByDeviceId(this.getData().id, this._devices);
        if (!device) {
            return;
        }
        let zoneId = device.zone;

        let humidity = await humidityLib.findHumidity(this, zoneId, this._devices);
        if (humidity === undefined || humidity === null) {
            return;
        }

        let targetHumidity = humidityLib.findTargetHumidity(this, opts);
        if (targetHumidity === undefined || targetHumidity === null) {
            return;
        }

        let onoff = humidityLib.resolveOnoff(this, humidity, targetHumidity, this.getSettings(), opts);

        await humidityLib.switchFanDevices(this, zoneId, this._devices, onoff, this.getSettings());
    }

}

module.exports = VHumidityDevice;