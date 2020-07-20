'use strict';

const Homey = require('homey');
const BaseDevice = require('../../lib/BaseDevice');

module.exports = class VThermoDevice extends BaseDevice {

    async onInit() {
        await this.migrate();
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
        let ok = true;
        if (changedKeysArr.includes('onoff_enabled') &&
            !newSettingsObj.onoff_enabled &&
            this.getCapabilityValue('onoff') !== true) {
            this.setCapabilityValue('onoff', true).catch(err => this.log(err));
        } else if ((changedKeysArr.includes('target_zone_to_other') || changedKeysArr.includes('target_zone_from_other')) &&
            newSettingsObj.target_zone_to_other &&
            newSettingsObj.target_zone_from_other) {
            callback(new Error(`Choose either "From other thermostat" or "Update other thermostat"`), null);
            ok = false;
        }
        if (ok) {
            setTimeout(() => {
                Homey.app.refreshDevice(this);
            }, 1000);
            callback(null, true);
        }
    }

    getTemperatureSettings() {
        const settings = this.getSettings();
        return {
            calcMethod: settings.calc_method,
            zone: {
                sensor: settings.zone_sensors,
                thermostat: settings.thermostat,
                vthermo: false,
                other: settings.zone_other
            },
            parent: {
                sensor: settings.parent_sensors,
                thermostat: settings.parent_thermostat,
                vthermo: settings.parent_vthermo,
                other: settings.parent_other
            },
            children: {
                sensor: settings.sub_sensors,
                thermostat: settings.sub_thermostat,
                vthermo: settings.sub_vthermo,
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
                from_other: !settings.target_zone_to_other && settings.target_zone_from_other,
                to_other: settings.target_zone_to_other
            },
            sub_zones: {
                to_vthermo: settings.target_sub_zones_to_vthermo,
                to_other: settings.target_sub_zones_to_other
            },
            all_sub_zones: {
                to_vthermo: settings.target_all_sub_zones_to_vthermo,
                to_other: settings.target_all_sub_zones_to_other
            }
        };
    }
};
