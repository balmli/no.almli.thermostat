'use strict';

const Homey = require('homey');
const BaseDevice = require('../../lib/BaseDevice');

module.exports = class VThermoDevice extends BaseDevice {

    async onInit() {
        await this.migrate();
        this.log('onInit: end');
    }

    async migrate() {
        try {
            if (!this.hasCapability('onoff')) {
                await this.addCapability('onoff');
                await this.setCapabilityValue('onoff', true);
            }
        } catch (err) {
            this.log('migration failed', err);
        }
    }

    async onAdded() {
        await this.setCapabilityValue('onoff', true);
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

    getTemperatureSettings() {
        const settings = this.getSettings();
        return {
            calcMethod: settings.calc_method,
            zone: {
                sensor: settings.zone_sensors,
                thermostat: settings.thermostat,
                other: settings.zone_other
            },
            parent: {
                sensor: settings.parent_sensors,
                thermostat: settings.parent_thermostat,
                other: settings.parent_other
            },
            children: {
                sensor: settings.sub_sensors,
                thermostat: settings.sub_thermostat,
                other: settings.sub_other
            }
        };
    }

    getTargetSettings() {
        const settings = this.getSettings();
        return {
            offset: settings.target_diff_temp,
            min: settings.target_min_temp,
            max: settings.target_max_temp,
            zone: {
                other: settings.target_zone_to_other,
                from_other: settings.target_zone_from_other
            },
            sub_zones: {
                vthermo: settings.target_sub_zones_to_vthermo,
                other: settings.target_sub_zones_to_other
            },
            all_sub_zones: {
                vthermo: settings.target_all_sub_zones_to_vthermo,
                other: settings.target_all_sub_zones_to_other
            }
        };
    }
};
