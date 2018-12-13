'use strict';

const Homey = require('homey'),
    {HomeyAPI} = require('athom-api'),
    _ = require('lodash');

const modeNames = {
    "Comfort": "Comfort",
    "ECO": "Energy Saving",
    "Off": "Off",
    "Cooling": "Cooling"
};

class VThermoDevice extends Homey.Device {

    onInit() {
        this.log(this.getName() + ' -> virtual device initialized');

        this._modeChangedTrigger = new Homey.FlowCardTriggerDevice('vt_mode_changed');
        this._modeChangedTrigger
            .register();

        this._modeChangedToTrigger = new Homey.FlowCardTriggerDevice('vt_mode_changed_to');
        this._modeChangedToTrigger
            .register()
            .registerRunListener((args, state) =>
                Promise.resolve(args.vt_mode === state.vt_mode));

        this._turnedOnTrigger = new Homey.FlowCardTriggerDevice('vt_onoff_true');
        this._turnedOnTrigger
            .register();

        this._turnedOffTrigger = new Homey.FlowCardTriggerDevice('vt_onoff_false');
        this._turnedOffTrigger
            .register();

        this._onoffCondition = new Homey.FlowCardCondition('onoff_is_on')
            .register()
            .registerRunListener((args, state) => {
                return args.device.getCapabilityValue('vt_onoff');
            });

        this._modeIsCondition = new Homey.FlowCardCondition('vt_mode_is')
            .register()
            .registerRunListener((args, state) => {
                return args.vt_mode === args.device.getCapabilityValue('vt_mode');
            });

        this._changeModeAction = new Homey.FlowCardAction('vt_change_mode')
            .register()
            .registerRunListener((args, state) => {
                args.device.log(this.getName() + ' -> vt_change_mode action', args);
                args.device.setCapabilityValue('vt_mode', args.vt_mode); // Will trig vt_mode - cap. listener ?

                let setpointValue = args.device.getSetting(`${args.vt_mode}_setpoint`);
                if (setpointValue) {
                    args.device.setCapabilityValue('target_temperature', setpointValue); // Will trig target_temperature cap. listener ?
                } else {
                    setpointValue = args.device.getCapabilityValue('target_temperature');
                }

                return this.checkTemp({target_temperature: setpointValue, vt_mode: args.vt_mode});
            });

        this._changeModeSetpointAction = new Homey.FlowCardAction('vt_change_mode_setpoint')
            .register()
            .registerRunListener((args, state) => {
                args.device.log(this.getName() + ' -> vt_change_mode_setpoint action', args);
                updateSettings(args.device, args.vt_mode, args.setpointValue);
                if (args.vt_mode === args.device.getCapabilityValue('vt_mode')) {
                    args.device.log('Updated thermostat setpoint on UI to', args.setpointValue);
                    args.device.setCapabilityValue('target_temperature', args.setpointValue); // Will trig target_temperature cap. listener ?
                    return this.checkTemp({target_temperature: args.setpointValue});
                }
                return this.checkTemp({});
            });

        this.registerCapabilityListener('vt_onoff', (value, opts) => {
            this.log(this.getName() + ' -> vt_onoff changed: ', value, opts);
            return Promise.resolve();
        });

        this.registerCapabilityListener('target_temperature', (value, opts) => {
            this.log(this.getName() + ' -> target_temperature changed: ', value, opts);
            // TODO update settings with new target_temperature ?
            //let vtMode = args.device.getCapabilityValue('vt_mode');
            //await updateSettings(this, vtMode, value);
            return this.checkTemp({target_temperature: value});
        });

        this.registerCapabilityListener('vt_mode', (value, opts) => {
            this.log(this.getName() + ' -> vt_mode changed: ', value, opts);

            const thermostatModeObj = {
                mode: value,
                mode_name: modeNames[value]
            };
            this._modeChangedTrigger.trigger(this, thermostatModeObj, null);
            this._modeChangedToTrigger.trigger(this, null, thermostatModeObj);
            if (value === 'Off') {
                this.setCapabilityValue('vt_onoff', false); // Will trig vt_onoff cap. listener ?
            }

            // TODO update target_temperature when mode changes ?

            return Promise.resolve();
        });

        this.registerCapabilityListener('measure_temperature', (value, opts) => {
            this.log(this.getName() + ' -> measure_temperature changed: ', value, opts);
            return Promise.resolve();
        });

        this.checkTemp();
    }

    onAdded() {
        this.log(this.getName() + ' -> virtual device added:', this.getData().id);
    }

    onDeleted() {
        this.log(this.getName() + ' -> virtual device deleted');
    }

    onSettings(oldSettings, newSettings, changedKeys) {
        this.log('onSettings', oldSettings, newSettings, changedKeys);
    }

    async updateSettings(device, vtMode, setpointValue) {
        if (vtMode === 'Comfort') {
            await device.setSettings({Comfort_setpoint: setpointValue});
        } else if (vtMode === 'ECO') {
            await device.setSettings({ECO_setpoint: setpointValue});
        } else if (vtMode === 'Cooling') {
            await device.setSettings({Cooling_setpoint: setpointValue});
        }
    }

    async checkTemp(opts) {

        let settings = this.getSettings();
        let zoneName = settings.zoneName;
        if (!zoneName) {
            this.log(this.getName() + ' -> no zoneName defined');
            this.scheduleCheckTemp(60);
            return Promise.reject('no_zoneName_defined');
        }
        let hysteresis = settings.hysteresis || 0.5;

        let currentTemperature = this.getCapabilityValue('measure_temperature');
        if (currentTemperature) {
            this.log(this.getName() + ' @ ' + zoneName + ' -> current temperature', currentTemperature);
        }

        let targetTemp = opts ? opts.target_temperature : undefined;
        if (!targetTemp) {
            targetTemp = this.getCapabilityValue('target_temperature');
        }
        if (!targetTemp) {
            this.log(this.getName() + ' @ ' + zoneName + ' -> no target_temperature defined');
            this.scheduleCheckTemp(60);
            return Promise.reject('no_target_temperature_defined');
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
            return Promise.reject('no_temperature_sensor_in_zone');
        }

        let newTemperature = thermometer.state.measure_temperature;
        if (!currentTemperature || currentTemperature !== newTemperature) {
            await this.setCapabilityValue('measure_temperature', newTemperature);
            this.log(this.getName() + ' @ ' + zoneName + ' -> trigged temperature change', newTemperature);
        }

        let vtMode = opts && opts.vt_mode ? opts.vt_mode : undefined;
        if (!vtMode) {
            vtMode = this.getCapabilityValue('vt_mode');
        }

        let onoff = undefined;
        if (vtMode === 'Off' || newTemperature > (targetTemp + hysteresis)) {
            onoff = false;
        } else if (newTemperature < (targetTemp - hysteresis)) {
            onoff = true;
        }

        if (onoff !== undefined) {
            this.setCapabilityValue('vt_onoff', onoff);
            for (let device in devices) {
                let d = devices[device];
                if (d.zone.name === zoneName && d.class === 'heater' && d.state.onoff !== onoff) {
                    await d.setCapabilityValue('onoff', onoff);
                    this.log(this.getName() + ' @ ' + zoneName + ' -> ' + d.name + ' set to ', onoff);
                }
            }
            if (onoff) {
                this._turnedOnTrigger.trigger(this);
                this.log('turnedOnTrigger', onoff);
            } else {
                this._turnedOffTrigger.trigger();
                this.log('turnedOffTrigger', onoff);
            }
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