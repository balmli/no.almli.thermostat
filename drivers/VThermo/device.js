'use strict';

const Homey = require('homey');
const BaseDevice = require('../../lib/BaseDevice');

module.exports = class VThermoDevice extends BaseDevice {

    async onInit() {
        await this.migrate();
        this.registerCapabilityListener('onoff', async (value, opts) => {
            if (!this.getSetting('onoff_enabled')) {
                if (this.getCapabilityValue('onoff') !== true) {
                    await this.setCapabilityValue('onoff', true).catch(err => this.log(err));
                }
                throw new Error('Switching the device off has been disabled');
            }
        });
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
        if (changedKeysArr.includes('target_step')) {
            const step = parseInt(newSettingsObj.target_step.substr(4)) / 100;
            this.updateTargetTempStep(step);
        }
        setTimeout(() => {
            Homey.app.refreshDevice(this);
        }, 1000);
        callback(null, true);
    }

    async updateTargetTempStep(step) {
        let capOptions = this.getCapabilityOptions('target_temperature');
        if (capOptions.step !== step) {
            try {
                capOptions.step = step;
                capOptions.decimals = step >= 0.5 ? 1 : 2;
                await this.setCapabilityOptions('target_temperature', capOptions);
                this.log('Updated cap options for target_temperature = ', this.getCapabilityOptions('target_temperature'));
            } catch (err) {
                this.log('updateTargetTempStep ERROR', err);
            }
        }
    }

    async updateInvertSwitch(invert) {
        try {
            await this.setSettings({ invert });
            Homey.app.refreshDevice(this);
        } catch (err) {
            this.log('updateInvertSwitch ERROR', err);
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

    getDevicesSettings() {
        const settings = this.getSettings();
        return {
            zone: {
                clazz: true
            },
            sub_zones: {
                clazz: settings.devices_sub_zones_heaters
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
                from_other: settings.target_zone_from_other,
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
