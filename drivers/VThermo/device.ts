import {BaseDevice} from '../../lib/BaseDevice';

module.exports = class VThermoDevice extends BaseDevice {
    async onInit(): Promise<void> {
        super.onInit();
        await this.migrate();
        await this.initialize();
    }

    async migrate(): Promise<void> {
        try {
            if (!this.hasCapability('thermostat_mode')) {
                await this.addCapability('thermostat_mode');
            }
            try {
                await this.setCapabilityOptions('thermostat_mode', {
                    values: [
                        {id: 'auto', title: {en: 'Auto'}},
                        {id: 'heat', title: {en: 'Heat'}},
                        {id: 'cool', title: {en: 'Cool'}},
                        {id: 'off', title: {en: 'Off'}},
                    ],
                });
            } catch (err) {
                this.logger.error('setCapabilityOptions thermostat_mode failed', err);
            }
            if (
                this.getCapabilityValue('thermostat_mode') === null ||
                this.getCapabilityValue('thermostat_mode') === undefined
            ) {
                const defaultMode = this.getSetting('invert') ? 'cool' : 'heat';
                await this.setCapabilityValue('thermostat_mode', defaultMode).catch(err => this.logger.error(err));
            }
            if (!this.hasCapability('vt_cooling')) {
                await this.addCapability('vt_cooling');
                await this.setCapabilityValue('vt_cooling', false).catch(err => this.logger.error(err));
            }
            if (!this.hasCapability('vt_thermostat_preset')) {
                await this.addCapability('vt_thermostat_preset');
            }
            try {
                await this.setCapabilityOptions('vt_thermostat_preset', {
                    values: [
                        {id: 'comfort', title: {en: 'Comfort'}},
                        {id: 'eco', title: {en: 'Eco'}},
                        {id: 'away', title: {en: 'Away'}},
                        {id: 'boost', title: {en: 'Boost'}},
                    ],
                });
            } catch (err) {
                this.logger.error('setCapabilityOptions vt_thermostat_preset failed', err);
            }
            if (
                this.getCapabilityValue('vt_thermostat_preset') === null ||
                this.getCapabilityValue('vt_thermostat_preset') === undefined
            ) {
                await this.setCapabilityValue('vt_thermostat_preset', 'comfort').catch(err => this.logger.error(err));
            }
            const allowedCapabilities = new Set([
                'onoff',
                'vt_onoff',
                'vt_cooling',
                'target_temperature',
                'measure_temperature',
                'vt_dew_point',
                'vt_condensation_alarm',
                'thermostat_mode',
                'vt_thermostat_preset',
            ]);

            for (const cap of this.getCapabilities()) {
                if (!allowedCapabilities.has(cap)) {
                    await this.removeCapability(cap).catch(err =>
                        this.logger.error(`removeCapability ${cap} failed:`, err),
                    );
                }
            }
            if (!this.hasCapability('vt_dew_point')) {
                await this.addCapability('vt_dew_point');
            }
            try {
                await this.setCapabilityOptions('vt_dew_point', {
                    title: this.homey.__('capabilities.vt_dew_point.title'),
                    units: {
                        en: '°C',
                        no: '°C',
                        nl: '°C',
                    },
                    decimals: 1,
                    icon: '/assets/cooling.svg',
                });
            } catch (err) {
                this.logger.error('setCapabilityOptions vt_dew_point failed', err);
            }
            if (!this.hasCapability('vt_condensation_alarm')) {
                await this.addCapability('vt_condensation_alarm');
                await this.setCapabilityValue('vt_condensation_alarm', false).catch(err => this.logger.error(err));
            }
            try {
                await this.setCapabilityOptions('vt_condensation_alarm', {
                    title: this.homey.__('capabilities.vt_condensation_alarm.title'),
                    icon: '/assets/droplet.svg',
                });
            } catch (err) {
                this.logger.error('setCapabilityOptions vt_condensation_alarm failed', err);
            }
            try {
                await this.setCapabilityOptions('vt_cooling', {
                    title: this.homey.__('capabilities.vt_cooling.title'),
                });
            } catch (err) {
                this.logger.error('setCapabilityOptions vt_cooling failed', err);
            }
            try {
                await this.setCapabilityOptions('vt_onoff', {
                    title: this.homey.__('capabilities.vt_onoff.title'),
                });
            } catch (err) {
                this.logger.error('setCapabilityOptions vt_onoff failed', err);
            }
        } catch (err) {
            this.logger.error('migration failed', err);
        }
    }

    async initialize(): Promise<void> {
        this.registerCapabilityListener('onoff', async (value: any, opts: any) => {
            if (!this.getSetting('onoff_enabled')) {
                if (this.getCapabilityValue('onoff') !== true) {
                    await this.setCapabilityValue('onoff', true).catch(err => this.logger.error(err));
                }
                throw new Error(this.homey.__('error.switching_disabled'));
            }
            // Keep the Web API-backed model in sync immediately so switching off
            // cannot depend on a later capability subscription event.
            // @ts-ignore
            this.homey.app.updateByDataId(this.getData().id, 'onoff', value);
        });
        this.registerCapabilityListener('target_temperature', async (value: any, opts: any) => {
            // @ts-ignore
            this.homey.app.updateByDataId(this.getData().id, 'target_temperature', value);
        });
        this.registerCapabilityListener('thermostat_mode', async (value: any, opts: any) => {
            // @ts-ignore
            this.homey.app.updateByDataId(this.getData().id, 'thermostat_mode', value);
            await this.homey.flow
                .getDeviceTriggerCard('vt_thermostat_mode_changed')
                .trigger(this, {mode: value}, {})
                .catch((err: any) => this.logger.error(err));
        });
        this.registerCapabilityListener('vt_thermostat_preset', async (value: any, opts: any) => {
            // @ts-ignore
            this.homey.app.updateByDataId(this.getData().id, 'vt_thermostat_preset', value);
            await this.homey.flow
                .getDeviceTriggerCard('vt_thermostat_preset_changed')
                .trigger(this, {preset: value}, {})
                .catch((err: any) => this.logger.error(err));
        });
    }

    onAdded(): void {
        this.setCapabilityValue('onoff', true).catch(err => this.logger.error(err));
        this.setCapabilityValue('thermostat_mode', 'heat').catch(err => this.logger.error(err));
        this.setCapabilityValue('vt_thermostat_preset', 'comfort').catch(err => this.logger.error(err));
        this.setCapabilityValue('vt_cooling', false).catch(err => this.logger.error(err));
        this.setCapabilityValue('vt_condensation_alarm', false).catch(err => this.logger.error(err));
    }

    async onSettings({
        oldSettings,
        newSettings,
        changedKeys,
    }: {
        oldSettings: any;
        newSettings: any;
        changedKeys: string[];
    }): Promise<string | void> {
        if (
            changedKeys.includes('onoff_enabled') &&
            !newSettings.onoff_enabled &&
            this.getCapabilityValue('onoff') !== true
        ) {
            await this.setCapabilityValue('onoff', true).catch(err => this.logger.error(err));
        }
        const target_temp_min = changedKeys.includes('target_min_temp') ? newSettings.target_min_temp : undefined;
        const target_temp_max = changedKeys.includes('target_max_temp') ? newSettings.target_max_temp : undefined;
        const target_temp_step = changedKeys.includes('target_step')
            ? parseInt(newSettings.target_step.substr(4)) / 100
            : undefined;
        const err = await this.updateTargetTemp(target_temp_min, target_temp_max, target_temp_step);
        if (err) {
            throw new Error(err);
        } else {
            // Keep the Web API-backed model in sync before calculation. Waiting for
            // a later device.update event can leave onoff_enabled stale long enough
            // for an off device to be evaluated as if switching were disabled.
            // @ts-ignore
            this.homey.app.updateSettingsByDataId(this.getData().id, newSettings);
        }
    }

    async updateTargetTemp(min: number, max: number, step: number | undefined): Promise<void | string> {
        if (min === undefined && max === undefined && step === undefined) {
            return;
        }
        let capOptions;
        try {
            capOptions = this.getCapabilityOptions('target_temperature');
        } catch (err) {
            capOptions = {
                min: 1,
                max: 40,
                step: 0.5,
                decimals: 1,
            };
        }

        if ((min !== undefined ? min : capOptions.min) >= (max !== undefined ? max : capOptions.max)) {
            return this.homey.__('error.invalid_target_temps');
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
                this.logger.info(
                    `Updated cap options from ${min} ${max} ${step} for target temperature`,
                    this.getCapabilityOptions('target_temperature'),
                );
            }
        } catch (err) {
            this.logger.error('updateTargetTempStep ERROR', err);
        }
    }

    async updateInvertSwitch(invert: boolean): Promise<void> {
        try {
            await this.setSettings({invert});
            // @ts-ignore
            this.homey.app.startCalculation();
        } catch (err) {
            this.logger.error('updateInvertSwitch ERROR', err);
        }
    }

    async updateMeasureTemperature(temperature: number): Promise<void> {
        const temp = temperature ? Math.round(100 * temperature) / 100 : undefined;
        if (!temp || temp < -150 || temp > 150) {
            throw new Error(this.homey.__('error.invalid_temperature_input'));
        }
        try {
            this.logger.info('updateMeasureTemperature', temperature);
            const calc_method = 'MANUAL';
            await this.setSettings({calc_method});
            await this.setCapabilityValue('measure_temperature', temp).catch(err => this.logger.error(err));
            // @ts-ignore
            this.homey.app.startCalculation();
        } catch (err) {
            this.logger.error('updateMeasureTemperature ERROR', err);
        }
    }

    async updateTargetTempMinMaxStep(
        target_min_temp: number,
        target_max_temp: number,
        target_step: string,
    ): Promise<void> {
        const err = await this.updateTargetTemp(
            target_min_temp,
            target_max_temp,
            parseInt(target_step.substr(4)) / 100,
        );
        if (err) {
            throw new Error(err);
        }
        try {
            await this.setSettings({target_min_temp, target_max_temp, target_step});
            // @ts-ignore
            this.homey.app.startCalculation();
            this.logger.info(
                `Target temperature min/max/step updated to ${target_min_temp} ${target_max_temp} ${target_step}`,
            );
        } catch (err) {
            this.logger.error('updateTargetTempMinMaxStep ERROR', err);
        }
    }

    async updateTargetTempOffset(target_diff_temp: number): Promise<void> {
        try {
            await this.setSettings({target_diff_temp});
            // @ts-ignore
            this.homey.app.startCalculation();
            this.logger.info(`Target temperature offset updated to ${target_diff_temp}`);
        } catch (err) {
            this.logger.error('updateTargetTempOffset ERROR', err);
        }
    }

    async updateTargetUpdateEnabled(target_update_enabled: boolean): Promise<void> {
        try {
            await this.setSettings({target_update_enabled});
            this.logger.info(`Target temperature update enabled set to ${target_update_enabled}`);
        } catch (err) {
            this.logger.error('updateTargetUpdateEnabled ERROR', err);
        }
    }

    async updateThermostatMode(mode: string): Promise<void> {
        try {
            await this.setCapabilityValue('thermostat_mode', mode).catch(err => this.logger.error(err));
            // @ts-ignore
            this.homey.app.updateByDataId(this.getData().id, 'thermostat_mode', mode);
            await this.homey.flow
                .getDeviceTriggerCard('vt_thermostat_mode_changed')
                .trigger(this, {mode}, {})
                .catch(err => this.logger.error(err));
            // @ts-ignore
            this.homey.app.startCalculation();
            this.logger.info(`Thermostat mode updated to ${mode}`);
        } catch (err) {
            this.logger.error('updateThermostatMode ERROR', err);
        }
    }

    async updateThermostatPreset(preset: string): Promise<void> {
        try {
            await this.setCapabilityValue('vt_thermostat_preset', preset).catch(err => this.logger.error(err));
            // @ts-ignore
            this.homey.app.updateByDataId(this.getData().id, 'vt_thermostat_preset', preset);
            await this.homey.flow
                .getDeviceTriggerCard('vt_thermostat_preset_changed')
                .trigger(this, {preset}, {})
                .catch(err => this.logger.error(err));
            // @ts-ignore
            this.homey.app.startCalculation();
            this.logger.info(`Thermostat preset updated to ${preset}`);
        } catch (err) {
            this.logger.error('updateThermostatPreset ERROR', err);
        }
    }
};
