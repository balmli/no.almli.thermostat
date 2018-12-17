'use strict';

const Homey = require('homey'),
    {HomeyAPI} = require('athom-api'),
    _ = require('lodash');

class VThermoDevice extends Homey.Device {

    onInit() {
        this.log('virtual device initialized');

        this._turnedOnTrigger = new Homey.FlowCardTriggerDevice('vt_onoff_true');
        this._turnedOnTrigger
            .register();

        this._turnedOffTrigger = new Homey.FlowCardTriggerDevice('vt_onoff_false');
        this._turnedOffTrigger
            .register();

        this._onoffCondition = new Homey.FlowCardCondition('vt_onoff_is_on')
            .register()
            .registerRunListener((args, state) => args.device.getCapabilityValue('vt_onoff'));

        this.registerCapabilityListener('target_temperature', (value, opts) => {
            return this.checkTemp({target_temperature: value});
        });

        this.checkTemp();
    }

    onAdded() {
        this.log('virtual device added:', this.getData().id);
    }

    onDeleted() {
        this.log('virtual device deleted');
    }

    clearCheckTime() {
        if (this.curTimeout) {
            clearTimeout(this.curTimeout);
            this.curTimeout = undefined;
        }
    }

    scheduleCheckTemp(seconds) {
        this.clearCheckTime();
        this.log(`Checking temp in ${seconds} seconds`);
        this.curTimeout = setTimeout(this.checkTemp.bind(this), seconds * 1000);
    }

    async checkTemp(opts) {
        this.clearCheckTime();

        let currentHomey = await HomeyAPI.forCurrentHomey();
        let devices = await currentHomey.devices.getDevices();

        let thisDevice = _(devices).find(d => d.data && d.data.id === this.getData().id);
        let zoneId = thisDevice.zone.id;

        let settings = this.getSettings();
        let hysteresis = settings.hysteresis || 0.5;

        let targetTemp = this.findTargetTemperature(opts);
        if (!targetTemp) {
            this.scheduleCheckTemp(60);
            return Promise.resolve();
        }

        let temperature = this.findTemperature(zoneId, devices);
        if (!temperature) {
            this.scheduleCheckTemp(60);
            return Promise.resolve();
        }

        let onoff = undefined;
        if (temperature > (targetTemp + hysteresis)) {
            onoff = false;
        } else if (temperature < (targetTemp - hysteresis)) {
            onoff = true;
        }

        if (onoff !== undefined) {
            this.setCapabilityValue('vt_onoff', onoff);
            for (let device in devices) {
                let d = devices[device];
                if (d.zone.id === zoneId && d.class === 'heater' && d.state.onoff !== onoff) {
                    await d.setCapabilityValue('onoff', onoff);
                    this.log(d.name + ' set to ' + onoff);
                }
            }
            if (onoff) {
                this._turnedOnTrigger.trigger(this);
                this.log('trigged thermostat turned on');
            } else {
                this._turnedOffTrigger.trigger(this);
                this.log('trigged thermostat turned off');
            }
        }

        this.scheduleCheckTemp(60);

        return Promise.resolve();
    }

    findTargetTemperature(opts) {
        let targetTemp = opts && opts.target_temperature ? opts.target_temperature : undefined;
        if (!targetTemp) {
            targetTemp = this.getCapabilityValue('target_temperature');
        }
        if (!targetTemp) {
            this.log('no target_temperature defined');
        } else {
            this.log('target temperature', targetTemp);
        }
        return targetTemp;
    }

    findTemperature(zoneId, devices) {
        let currentTemperature = this.getCapabilityValue('measure_temperature');

        let sumTemp = 0;
        let numTemp = 0;
        for (let device in devices) {
            let d = devices[device];
            if (d.zone.id === zoneId && d.class === 'sensor' && d.capabilities.measure_temperature) {
                sumTemp += d.state.measure_temperature;
                numTemp ++;
            }
        }
        if (numTemp === 0) {
            this.setCapabilityValue('measure_temperature', null);
            this.log('no temperature sensor in zone', zoneId);
            return;
        }
        let temperature = sumTemp / numTemp;
        if (!currentTemperature || currentTemperature !== temperature) {
            this.setCapabilityValue('measure_temperature', temperature);
            this.log('trigged temperature change', temperature);
        }
        this.log('temperature', temperature);
        return temperature;
    }

}

module.exports = VThermoDevice;