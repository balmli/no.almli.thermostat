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
            return Promise.resolve();
        });

        /*
        this.registerMultipleCapabilityListener(this.getCapabilities(), (changedCapabs, optsObj) => {
            this.log(this.getName() + ' -> capability changed: ', changedCapabs);
            return Promise.resolve();
        }, 500);
        */

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
        //let zoneName = settings.zoneName;
        let hysteresis = settings.hysteresis || 0.5;

        /*
        if (!zoneName) {
            this.log(this.getName() + ' -> no zoneName defined');
            this.scheduleCheckTemp(60);
            return Promise.resolve();
        }
        */

        let zone = this.getZone();

        this.log('zone', zone);
        this.log('hysteresis', hysteresis);

        let state = this.getState();
        this.log(this.getName() + ' -> state', state);

        let currentTemperature = this.getCapabilityValue('measure_temperature');
        if (currentTemperature) {
            this.log(this.getName() + ' -> current temperature', currentTemperature);
        }

        let targetTemp = this.getCapabilityValue('target_temperature');
        if (!targetTemp) {
            this.log(this.getName() + ' -> no target_temperature defined');
            this.scheduleCheckTemp(60);
            return Promise.resolve();
        }
        this.log(this.getName() + ' -> target temperature', targetTemp);

        let currentHomey = await HomeyAPI.forCurrentHomey();
        let devices = await currentHomey.devices.getDevices();
        //let devices = await Homey.app.getDevices();
//    .filter(d => d.zone === zone)
        _(devices)
            .forEach(d => this.log(d.name, d.zone, d.driverId, d.class));

        let thermometer = _(devices)
            .filter(d => d.zone === zone)
            .find(d => d.class === 'sensor' && d.capabilities.measure_temperature);

        if (!thermometer) {
            this.log(this.getName() + ' -> no temperature sensor in zone', zone);
            this.scheduleCheckTemp(60);
            return Promise.resolve();
        }

        let newTemperature = thermometer.state.measure_temperature;
        if (!currentTemperature || currentTemperature !== newTemperature) {
            this._tempChangedTrigger.trigger(this, {temperature: newTemperature});
            this.setCapabilityValue('measure_temperature', newTemperature);
            this.log(this.getName() + ' -> trigged temperature change', newTemperature);
        }

        let onoff = undefined;
        if (newTemperature > (targetTemp + hysteresis)) {
            onoff = false;
        } else if (newTemperature < (targetTemp - hysteresis)) {
            onoff = true;
        }

        if (onoff !== undefined) {
            _(devices)
                .filter(d => d.zone === zone && d.class === 'heater')
                .forEach(d => {
                    //d.setCapabilityValue('onoff', onoff);
                    this.log(this.getName() + ' -> ' + d.name + ' set to ', onoff);
                });
        }

        this.scheduleCheckTemp(60);

        return Promise.resolve();
    }

    scheduleCheckTemp(seconds) {
        this.log(`Checking temp in ${seconds} seconds`);
        setTimeout(this.checkTemp.bind(this), seconds * 1000);
    }

}

module.exports = VThermoDevice;