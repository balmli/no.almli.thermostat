'use strict';

const Homey = require('homey'),
    {HomeyAPI} = require('athom-api'),
    _ = require('lodash');

class VThermoDevice extends Homey.Device {

    onInit() {
        this.log(this.getName() + ' -> virtual device initialized');

        this._targetTempChangedTrigger = new Homey.FlowCardTriggerDevice('vt_target_temperature_changed');
        this._targetTempChangedTrigger.register();

        this._tempChangedTrigger = new Homey.FlowCardTriggerDevice('vt_temperature_changed');
        this._tempChangedTrigger.register();

        this.registerCapabilityListener('measure_temperature', (value, opts) => {
            this.log(this.getName() + ' -> measure_temperature changed: ', value, opts);
            return Promise.resolve();
        });

        this.registerCapabilityListener('target_temperature', (value, opts) => {
            this.log(this.getName() + ' -> target_temperature changed: ', value, opts);
            return this.checkTemp();
        });

        this.checkTemp();
    }

    onAdded() {
        this.log(this.getName() + ' -> virtual device added:', this.getData().id);
    }

    onDeleted() {
        this.log(this.getName() + ' -> virtual device deleted');
    }

    async checkTemp() {

        let settings = this.getSettings();
        let zoneName = settings.zoneName;
        if (!zoneName) {
            this.log(this.getName() + ' -> no zoneName defined');
            this.scheduleCheckTemp(60);
            return Promise.resolve();
        }
        let hysteresis = settings.hysteresis || 0.5;

        let currentTemperature = this.getCapabilityValue('measure_temperature');
        if (currentTemperature) {
            this.log(this.getName() + ' @ ' + zoneName + ' -> current temperature', currentTemperature);
        }

        let targetTemp = this.getCapabilityValue('target_temperature');
        if (!targetTemp) {
            this.log(this.getName() + ' @ ' + zoneName + ' -> no target_temperature defined');
            this.scheduleCheckTemp(60);
            return Promise.resolve();
        }
        this.log(this.getName() + ' @ ' + zoneName + ' -> target temperature', targetTemp);

        let currentHomey = await HomeyAPI.forCurrentHomey();

        let devices = await currentHomey.devices.getDevices();

        let thermometer = _(devices)
            .filter(d => d.zone.name === zoneName)
            .find(d => d.class === 'sensor' && d.capabilities.measure_temperature);
        if (!thermometer) {
            this.log(this.getName() + ' @ ' + zoneName + ' -> no temperature sensor in zone', zoneName);
            this.scheduleCheckTemp(60);
            return Promise.resolve();
        }

        let newTemperature = thermometer.state.measure_temperature;
        if (!currentTemperature || currentTemperature !== newTemperature) {
            this._tempChangedTrigger.trigger(this, {temperature: newTemperature});
            await this.setCapabilityValue('measure_temperature', newTemperature);
            this.log(this.getName() + ' @ ' + zoneName + ' -> trigged temperature change', newTemperature);
        }

        let onoff = undefined;
        if (newTemperature > (targetTemp + hysteresis)) {
            onoff = false;
        } else if (newTemperature < (targetTemp - hysteresis)) {
            onoff = true;
        }

        if (onoff !== undefined) {
            _(devices)
                .filter(d => d.zone.name === zoneName && d.class === 'heater' && d.state.onoff !== onoff)
                .forEach(d => {
                    d.setCapabilityValue('onoff', onoff);
                    this.log(this.getName() + ' @ ' + zoneName + ' -> ' + d.name + ' set to ', onoff);
                });
        }

        this.scheduleCheckTemp(60);

        return Promise.resolve();
    }

    scheduleCheckTemp(seconds) {
        if (this.curTimeout) {
            clearTimeout(this.curTimeout);
        }
        this.log(`Checking temp in ${seconds} seconds`);
        this.curTimeout = setTimeout(this.checkTemp.bind(this), seconds * 1000);
    }

}

module.exports = VThermoDevice;