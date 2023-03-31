import { BaseDevice } from '../../lib/BaseDevice';

module.exports = class VThermoDevice extends BaseDevice {

  async onInit(): Promise<void> {
    super.onInit();
    await this.migrate();
    await this.initialize();
  }

  async migrate(): Promise<void> {
    try {
    } catch (err) {
      this.logger.error('migration failed', err);
    }
  }

  async initialize(): Promise<void> {
    this.registerCapabilityListener('onoff', async (value: any, opts: any) => {
      if (!this.getSetting('onoff_enabled')) {
        if (this.getCapabilityValue('onoff') !== true) {
          await this.setCapabilityValue('onoff', true)
              .catch(err => this.logger.error(err));
        }
        throw new Error(this.homey.__('error.switching_disabled'));
      }
    });
    this.registerCapabilityListener('target_temperature', async (value: any, opts: any) => {
      // @ts-ignore
      this.homey.app.updateByDataId(this.getData().id, 'target_temperature', value);
    });
  }

  onAdded(): void {
    this.setCapabilityValue('onoff', true)
        .catch(err => this.logger.error(err));
  }

  async onSettings({ oldSettings, newSettings, changedKeys }: {
    oldSettings: any;
    newSettings: any;
    changedKeys: string[];
  }): Promise<string | void> {

    if (changedKeys.includes('onoff_enabled') &&
        !newSettings.onoff_enabled &&
        this.getCapabilityValue('onoff') !== true) {
      await this.setCapabilityValue('onoff', true)
          .catch(err => this.logger.error(err));
    }
    const target_temp_min = changedKeys.includes('target_min_temp') ? newSettings.target_min_temp : undefined;
    const target_temp_max = changedKeys.includes('target_max_temp') ? newSettings.target_max_temp : undefined;
    const target_temp_step = changedKeys.includes('target_step') ? parseInt(newSettings.target_step.substr(4)) / 100 : undefined;
    const err = await this.updateTargetTemp(target_temp_min, target_temp_max, target_temp_step);
    if (err) {
      throw new Error(err);
    } else {
      this.homey.setTimeout(async () => {
        if (changedKeys.includes('target_min_temp') ||
            changedKeys.includes('target_max_temp') ||
            changedKeys.includes('target_diff_temp')) {
          //await this.homey.app.updateAllTargetTemperatures(this);
        }
        // @ts-ignore
        this.homey.app.startCalculation();
      }, 1000);
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
      }
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
        this.logger.info(`Updated cap options from ${min} ${max} ${step} for target temperature`, this.getCapabilityOptions('target_temperature'));
      }
    } catch (err) {
      this.logger.error('updateTargetTempStep ERROR', err);
    }
  }

  async updateInvertSwitch(invert: boolean): Promise<void> {
    try {
      await this.setSettings({ invert });
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
      await this.setSettings({ calc_method });
      await this.setCapabilityValue('measure_temperature', temp)
          .catch(err => this.logger.error(err));
      // @ts-ignore
      this.homey.app.startCalculation();
    } catch (err) {
      this.logger.error('updateMeasureTemperature ERROR', err);
    }
  }

  async updateTargetTempMinMaxStep(target_min_temp: number, target_max_temp: number, target_step: string): Promise<void> {
    const err = await this.updateTargetTemp(target_min_temp, target_max_temp, parseInt(target_step.substr(4)) / 100);
    if (err) {
      throw new Error(err);
    }
    try {
      await this.setSettings({ target_min_temp, target_max_temp, target_step });
      // @ts-ignore
      this.homey.app.startCalculation();
      this.logger.info(`Target temperature min/max/step updated to ${target_min_temp} ${target_max_temp} ${target_step}`);
    } catch (err) {
      this.logger.error('updateTargetTempMinMaxStep ERROR', err);
    }
  }

  async updateTargetTempOffset(target_diff_temp: number): Promise<void> {
    try {
      await this.setSettings({ target_diff_temp });
      // @ts-ignore
      this.homey.app.startCalculation();
      this.logger.info(`Target temperature offset updated to ${target_diff_temp}`);
    } catch (err) {
      this.logger.error('updateTargetTempOffset ERROR', err);
    }
  }

  async updateTargetUpdateEnabled(target_update_enabled: boolean): Promise<void> {
    try {
      await this.setSettings({ target_update_enabled });
      this.logger.info(`Target temperature update enabled set to ${target_update_enabled}`);
    } catch (err) {
      this.logger.error('updateTargetUpdateEnabled ERROR', err);
    }
  }

};
