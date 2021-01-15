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
                throw new Error(Homey.__('error.switching_disabled'));
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

    async onSettings(oldSettingsObj, newSettingsObj, changedKeysArr, callback) {
        if (changedKeysArr.includes('onoff_enabled') &&
            !newSettingsObj.onoff_enabled &&
            this.getCapabilityValue('onoff') !== true) {
            this.setCapabilityValue('onoff', true).catch(err => this.log(err));
        }
        const target_temp_min = changedKeysArr.includes('target_min_temp') ? newSettingsObj.target_min_temp : undefined;
        const target_temp_max = changedKeysArr.includes('target_max_temp') ? newSettingsObj.target_max_temp : undefined;
        const target_temp_step = changedKeysArr.includes('target_step') ? parseInt(newSettingsObj.target_step.substr(4)) / 100 : undefined;
        const err = await this.updateTargetTemp(target_temp_min, target_temp_max, target_temp_step);
        if (err) {
            callback(new Error(err), null);
        } else {
            setTimeout(async () => {
                if (changedKeysArr.includes('target_min_temp') ||
                    changedKeysArr.includes('target_max_temp') ||
                    changedKeysArr.includes('target_diff_temp')) {
                    await Homey.app.updateAllTargetTemperatures(this);
                }
                await Homey.app.refreshDevice(this);
            }, 5000);
            callback(null, true);
        }
    }

    async updateTargetTemp(min, max, step) {
        let capOptions = this.getCapabilityOptions('target_temperature');
        if ((min !== undefined ? min : capOptions.min) >= (max !== undefined ? max : capOptions.max)) {
            return Homey.__('error.invalid_target_temps');
        }
        try {
            if (min || max || step) {
                if (min && capOptions.min !== min) {
                    capOptions.min = min;
                }
                if (max && capOptions.max !== max) {
                    capOptions.max = max;
                }
                if (step && capOptions.step !== step) {
                    capOptions.step = step;
                    capOptions.decimals = step >= 0.5 ? 1 : 2;
                }
                await this.setCapabilityOptions('target_temperature', capOptions);
                this.log(`Updated cap options from ${min} ${max} ${step} for target temperature`, this.getCapabilityOptions('target_temperature'));
            }
        } catch (err) {
            this.log('updateTargetTempStep ERROR', err);
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

    async updateTargetTempMinMaxStep(target_min_temp, target_max_temp, target_step) {
        const err = await this.updateTargetTemp(target_min_temp, target_max_temp, parseInt(target_step.substr(4)) / 100);
        if (err) {
            throw new Error(err);
        }
        try {
            await this.setSettings({ target_min_temp, target_max_temp, target_step });
            await Homey.app.updateAllTargetTemperatures(this);
            this.log(`Target temperature min/max/step updated to ${target_min_temp} ${target_max_temp} ${target_step}`);
        } catch (err) {
            this.log('updateTargetTempMinMaxStep ERROR', err);
        }
    }

    async updateTargetTempOffset(target_diff_temp) {
        try {
            await this.setSettings({ target_diff_temp });
            await Homey.app.updateAllTargetTemperatures(this);
            this.log(`Target temperature offset updated to ${target_diff_temp}`);
        } catch (err) {
            this.log('updateTargetTempOffset ERROR', err);
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
