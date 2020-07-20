'use strict';

const Homey = require('homey');
const ValueStore = require('../../lib/ValueStore');
const BaseDevice = require('../../lib/BaseDevice');

module.exports = class VHumidityDevice extends BaseDevice {

    async onInit() {
        await this.migrate();

        this._humidityStore = new ValueStore();

        this.registerCapabilityListener('vh_target_humidity', async (value, opts) => {
            Homey.app._targetHumidityChangedTrigger.trigger(this, {
                humidity: value
            });
            this.setCapabilityValue('vh_target_humidity_view', value).catch(err => this.log(err));
            return Promise.resolve();
        });
    }

    async migrate() {
        try {
            if (!this.hasCapability('onoff')) {
                await this.addCapability('onoff');
                await this.setCapabilityValue('onoff', true);
            }
            if (!this.hasCapability('vh_target_humidity_view')) {
                await this.addCapability('vh_target_humidity_view');
                await this.setCapabilityValue('vh_target_humidity_view', this.getCapabilityValue('vh_target_humidity'));
            }
        } catch (err) {
            this.log('migration failed', err);
        }
    }

    async onAdded() {
        await this.setCapabilityValue('onoff', true);
        await this.setCapabilityValue('vh_target_humidity', 50);
    }

    onSettings(oldSettingsObj, newSettingsObj, changedKeysArr, callback) {
        if (changedKeysArr.includes('onoff_enabled') &&
            !newSettingsObj.onoff_enabled &&
            this.getCapabilityValue('onoff') !== true) {
            this.setCapabilityValue('onoff', true).catch(err => this.log(err));
        }
        setTimeout(() => {
            Homey.app.refreshDevice(this);
        }, 1000);
        callback(null, true);
    }

    getHumiditySettings() {
        const settings = this.getSettings();
        return {
            calcMethod: settings.calc_method_humidity
        };
    }
};
