'use strict';

const Homey = require('homey');
const { HomeyAPI } = require('athom-api');
const DeviceHandler = require('./lib/DeviceHandler');
const VThermoHandler = require('./lib/VThermoHandler');
const VHumidityHandler = require('./lib/VHumidityHandler');
const constants = require('./lib/constants');
const util = require('./lib/util');

module.exports = class VThermoApp extends Homey.App {

    async onInit() {
        try {
            this.log('VThermoApp:onInit: start');
            Homey.on('unload', () => this._onUninstall());
            await this.initFlows();
            await this.getApi();
            this._api.devices.setMaxListeners(9999);
            if (await this.shallWaitForHomey()) {
                await this.waitForHomey();
            }
            this._devices = new DeviceHandler({ api: this._api, log: this.log, error: this.error });
            this.getVThermoHandler().setDeviceHandler(this._devices);
            this.getVHumidityHandler().setDeviceHandler(this._devices);
            this._devices.on('device_registered', this._onDeviceRegistered.bind(this));
            this._devices.on('device_unregistered', this._onDeviceUnregistered.bind(this));
            this._devices.on('devices_registered', this._onDevicesRegistered.bind(this));
            this._devices.on('capability', this._onCapability.bind(this));
            await this._devices.registerDevices({});
            this.scheduleRegister();
            this.log('VThermoApp is running...');
        } catch (err) {
            this.log('onInit error', err);
        }
    }

    async initFlows() {
        this._turnedOnTriggerVThermo = new Homey.FlowCardTriggerDevice('vt_onoff_true');
        await this._turnedOnTriggerVThermo.register();

        this._turnedOffTriggerVThermo = new Homey.FlowCardTriggerDevice('vt_onoff_false');
        await this._turnedOffTriggerVThermo.register();

        new Homey.FlowCardCondition('vt_onoff_is_on')
            .register()
            .registerRunListener((args, state) => args.device.getCapabilityValue('vt_onoff'));

        this._targetHumidityChangedTrigger = new Homey.FlowCardTriggerDevice('vh_target_humidity_changed');
        await this._targetHumidityChangedTrigger.register();

        this._turnedOnTriggerVHumidity = new Homey.FlowCardTriggerDevice('vh_onoff_true');
        await this._turnedOnTriggerVHumidity.register();

        this._turnedOffTriggerVHumidity = new Homey.FlowCardTriggerDevice('vh_onoff_false');
        await this._turnedOffTriggerVHumidity.register();

        new Homey.FlowCardCondition('vh_onoff_is_on')
            .register()
            .registerRunListener((args, state) => args.device.getCapabilityValue('vt_onoff'));

        new Homey.FlowCardCondition('vh_humidity_increased_last_mins')
            .register()
            .registerRunListener((args, state) => {
                if (!args.change_pct_points || !args.minutes) {
                    return false;
                }
                const changeLastMinutes = args.device._humidityStore.changePctPointsLastMinutes(args.minutes);
                return changeLastMinutes !== undefined && changeLastMinutes >= args.change_pct_points;
            });

        new Homey.FlowCardCondition('vh_humidity_decreased_last_mins')
            .register()
            .registerRunListener((args, state) => {
                if (!args.change_pct_points || !args.minutes) {
                    return false;
                }
                const changeLastMinutes = args.device._humidityStore.changePctPointsLastMinutes(args.minutes);
                return changeLastMinutes !== undefined && (-1.0 * changeLastMinutes) >= args.change_pct_points;
            });

        new Homey.FlowCardAction('update_invert_switch')
            .register()
            .registerRunListener((args, state) => args.device.updateInvertSwitch(args.invert_switch === 'true'));

        new Homey.FlowCardAction('vh_set_target_humidity')
            .register()
            .registerRunListener((args, state) => {
                args.device.setCapabilityValue('vh_target_humidity', args.vh_target_humidity).catch(err => args.device.log(err));
                args.device.setCapabilityValue('vh_target_humidity_view', args.vh_target_humidity).catch(err => args.device.log(err));
                return Promise.resolve();
            });
    }

    async shallWaitForHomey() {
        const uptime = (await this._api.system.getInfo()).uptime;
        return uptime < 600;
    }

    async waitForHomey() {
        let numDevices = 0;
        while (true) {
            let newRunningDevices = Object.keys(await this._api.devices.getDevices()).length;
            if (newRunningDevices && newRunningDevices === numDevices) {
                break;
            }
            numDevices = newRunningDevices;
            await util.delay(120 * 1000);
        }
    }

    async getApi() {
        if (!this._api) {
            this._api = await HomeyAPI.forCurrentHomey();
        }
        return this._api;
    }

    getVThermoHandler() {
        if (!this._vThermoHandler) {
            this._vThermoHandler = new VThermoHandler({ log: this.log, error: this.error });
            this._vThermoHandler.registerDriver(Homey.ManagerDrivers.getDriver(constants.DRIVER_VTHERMO));
        }
        return this._vThermoHandler;
    }

    getVHumidityHandler() {
        if (!this._vHumidityHandler) {
            this._vHumidityHandler = new VHumidityHandler({ log: this.log, error: this.error });
            this._vHumidityHandler.registerDriver(Homey.ManagerDrivers.getDriver(constants.DRIVER_VHUMIDITY));
        }
        return this._vHumidityHandler;
    }

    async refreshDevice(device, opts) {
        const driver = device.getDriver();
        const driverManifest = driver.getManifest();
        if (driverManifest.id === constants.DRIVER_VTHERMO) {
            await this.getVThermoHandler().refreshDevice(device, opts);
        } else if (driverManifest.id === constants.DRIVER_VHUMIDITY) {
            await this.getVHumidityHandler().refreshDevice(device, opts);
        }
    }

    _clearRegister() {
        if (this._timeoutRegister) {
            clearTimeout(this._timeoutRegister);
            this._timeoutRegister = undefined;
        }
    }

    scheduleRegister(interval = 43200) {
        this._clearRegister();
        this._timeoutRegister = setTimeout(this._onRegister.bind(this), interval * 1000);
    }

    async _onRegister() {
        try {
            this._clearRegister();
            await this._devices.registerDevices({});
        } finally {
            this.scheduleRegister();
        }
    }

    _onUninstall() {
        try {
            this._clearRegister();
            this._devices.unregisterDevices();
            delete this._devices;
        } catch (err) {
            this.log('_onUninstall error', err);
        }
    }

    _onDeviceRegistered(event) {
        this.getVThermoHandler().deviceRegistered(event.dataId, event.id);
        this.getVHumidityHandler().deviceRegistered(event.dataId, event.id);
    }

    _onDeviceUnregistered(event) {
    }

    _onDevicesRegistered(event) {
        this.getVThermoHandler().calculateAllDevices();
        this.getVHumidityHandler().calculateAllDevices();
    }

    _onCapability(event) {
        this.getVThermoHandler().onCapability(event);
        this.getVHumidityHandler().onCapability(event);
    }

};
