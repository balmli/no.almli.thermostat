'use strict';

const Homey = require('homey'),
    {HomeyAPI} = require('athom-api'),
    _ = require('lodash');

class VHumidityDevice extends Homey.Device {

    onInit() {
        this.log('virtual device initialized');

        this._humidityChangedTrigger = new Homey.FlowCardTriggerDevice('vh_humidity_changed');
        this._humidityChangedTrigger
            .register();

        this._targetHumidityChangedTrigger = new Homey.FlowCardTriggerDevice('vh_target_humidity_changed');
        this._targetHumidityChangedTrigger
            .register();

        this._turnedOnTrigger = new Homey.FlowCardTriggerDevice('vh_onoff_true');
        this._turnedOnTrigger
            .register();

        this._turnedOffTrigger = new Homey.FlowCardTriggerDevice('vh_onoff_false');
        this._turnedOffTrigger
            .register();

        this._onoffCondition = new Homey.FlowCardCondition('vh_onoff_is_on')
            .register()
            .registerRunListener((args, state) => args.device.getCapabilityValue('vt_onoff'));

        this._setTargetHumidityAction = new Homey.FlowCardAction('vh_set_target_humidity')
            .register()
            .registerRunListener((args, state) => {
                args.device.setCapabilityValue('vh_target_humidity', args.vh_target_humidity).catch(console.error);
                return this.checkHumidity({vh_target_humidity: args.vh_target_humidity});
            });

        this.registerCapabilityListener('vh_target_humidity', (value, opts) => {
            this._targetHumidityChangedTrigger.trigger(this, {
                humidity: value
            });
            return this.checkHumidity({vh_target_humidity: value});
        });

        this.checkHumidity();
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

    scheduleCheckHumidity(seconds) {
        this.clearCheckTime();
        this.log(`Checking humidity in ${seconds} seconds`);
        this.curTimeout = setTimeout(this.checkHumidity.bind(this), seconds * 1000);
    }

    async checkHumidity(opts) {
        this.clearCheckTime();

        let currentHomey = await HomeyAPI.forCurrentHomey();
        let devices = await currentHomey.devices.getDevices();

        let thisDevice = _(devices).find(d => d.data && d.data.id === this.getData().id);
        let zoneId = thisDevice.zone;

        let settings = this.getSettings();
        let hysteresis = settings.hysteresis || 1;

        let targetHumidity = this.findTargetHumidity(opts);
        if (targetHumidity === undefined || targetHumidity === null) {
            this.scheduleCheckHumidity(60);
            return Promise.resolve();
        }

        let humidity = this.findHumidity(zoneId, devices);
        if (humidity === undefined || humidity === null) {
            this.scheduleCheckHumidity(60);
            return Promise.resolve();
        }

        let onoff = undefined;
        if (humidity > (targetHumidity + hysteresis)) {
            onoff = true;
        } else if (humidity < (targetHumidity - hysteresis)) {
            onoff = false;
        }

        if (onoff !== undefined) {
            this.setCapabilityValue('vt_onoff', onoff).catch(console.error);
            for (let device in devices) {
                let d = devices[device];
                if (d.zone === zoneId &&
                    (d.class === 'fan' || d.virtualClass === 'fan') &&
                    d.capabilitiesObj &&
                    d.capabilitiesObj.onoff.value !== onoff) {
                    await d.setCapabilityValue('onoff', onoff).catch(console.error);
                    this.log(d.name + ' set to ' + onoff);
                }
            }
            if (onoff) {
                this._turnedOnTrigger.trigger(this);
                this.log('trigged fan turned on');
            } else {
                this._turnedOffTrigger.trigger(this);
                this.log('trigged fan turned off');
            }
        }

        this.scheduleCheckHumidity(60);

        return Promise.resolve();
    }

    findTargetHumidity(opts) {
        let targetHumidity = opts && opts.vh_target_humidity ? opts.vh_target_humidity : undefined;
        if (!targetHumidity) {
            targetHumidity = this.getCapabilityValue('vh_target_humidity');
        }
        if (!targetHumidity) {
            this.log('no target humidity defined');
        } else {
            this.log('target humidity', targetHumidity);
        }
        return targetHumidity;
    }

    findHumidity(zoneId, devices) {
        let sumHumidity = 0;
        let numHumidity = 0;
        for (let device in devices) {
            let d = devices[device];
            if (d.zone === zoneId &&
                d.class === 'sensor' &&
                d.capabilitiesObj &&
                d.capabilitiesObj.measure_humidity) {
                sumHumidity += d.capabilitiesObj.measure_humidity.value;
                numHumidity++;
            }
        }
        if (numHumidity === 0) {
            this.setCapabilityValue('measure_humidity', null).catch(console.error);
            this.log('no humidity sensor in zone', zoneId);
            return;
        }
        let humidity = sumHumidity / numHumidity;
        let currentHumidity = this.getCapabilityValue('measure_humidity');
        if (currentHumidity === undefined || currentHumidity === null || currentHumidity !== humidity) {
            this.setCapabilityValue('measure_humidity', humidity).catch(console.error);
            this._humidityChangedTrigger.trigger(this, {
                humidity: humidity
            });
            this.log('trigged humidity change', humidity);
        }
        this.log('humidity', humidity);
        return humidity;
    }

}

module.exports = VHumidityDevice;