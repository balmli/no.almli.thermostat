'use strict';

const util = require('./util');

module.exports = class BaseHandler {

    constructor(options, clazz, onTrigger, offTrigger) {
        options = options || {};
        this.log = options.log || console.log;
        this.error = options.log || console.log;
        this._deviceHandler = options.deviceHandler;
        this._clazz = clazz;
        this._onTrigger = onTrigger;
        this._offTrigger = offTrigger;
    }

    setDeviceHandler(deviceHandler) {
        if (!this._deviceHandler) {
            this._deviceHandler = deviceHandler;
        }
    }

    async registerDriver(driver) {
        this._driver = driver;
    }

    /**
     * Find the device by id.
     *
     * @param id
     * @returns {never}
     */
    getDevice(id) {
        return this._driver.getDevices().find(device => device.getId() === id);
    }

    /**
     * Return a device by data.id.
     *
     * @param dataId
     * @returns {never}
     */
    getDeviceByDataId(dataId) {
        return this._driver.getDevices().find(device => device.getData().id === dataId);
    }

    /**
     * Called after the device has been registred.
     * Stores the id and recalculates the device.
     *
     * @param dataId
     * @param id
     * @returns {Promise<void>}
     */
    async deviceRegistered(dataId, id) {
        const device = this.getDeviceByDataId(dataId);
        if (!device) {
            //this.log('deviceRegistered: missing device for dataId = ', dataId);
            return;
        }
        if (!device.setId) {
            this.log('deviceRegistered: missing setId for device for dataId = ', dataId);
        }
        device.setId(id);
        await this.calculateDevice(id, device);
    }

    /**
     * Listener for capability changes.
     *
     * @param event
     * @returns {Promise<undefined|void>}
     */
    async onCapability(event) {
        if (event.capId === 'onoff') {
            return (await this._onOnOff(event));
        } else if (event.capId === 'measure_temperature') {
            return (await this._onMeasureTemperature(event));
        } else if (event.capId === 'measure_humidity') {
            return (await this._onMeasureHumidity(event));
        } else if (event.capId === 'target_temperature') {
            return (await this._onTargetTemperature(event));
        } else if (event.capId === 'vh_target_humidity') {
            return (await this._onTargetHumidity(event));
        }
    }

    async _onOnOff(event) {
        const device = this.getDevice(event.id);
        if (device) {
            this.log('_onOnOff', event.id, event.name, event.capId, event.value);
            await this.switchDevice(device);
        }
    }

    async _onMeasureTemperature(event) {
        if (this.getDevice(event.id)) {
            // avoid loop
            return;
        }
        this.calculateAllDevices();
        await this.switchDevices();
    }

    async _onMeasureHumidity(event) {
        if (this.getDevice(event.id)) {
            // avoid loop
            return;
        }
        this.calculateAllDevices();
        await this.switchDevices();
    }

    async _onTargetTemperature(event) {
        const device = this.getDevice(event.id);
        if (device) {
            this.log('_onTargetTemperature', event.id, event.name, event.capId, event.value);
            await this.updateTargetTemperatures();
            await this.switchDevice(device);
        }
    }

    async _onTargetHumidity(event) {
        const device = this.getDevice(event.id);
        if (device) {
            this.log('_onTargetHumidity', event.id, event.name, event.capId, event.value);
            await this.switchDevice(device);
        }
    }

    /**
     * To recalculate all devices and switch the device.
     *
     * @param device
     * @param opts
     * @returns {Promise<void>}
     */
    async refreshDevice(device, opts) {
        this.calculateAllDevices();
        await this.switchDevice(device);
    }

    /**
     * Recalculate all devices.
     *
     * @returns {Promise<void>}
     */
    async calculateAllDevices() {
        for (let device of this._driver.getDevices()) {
            await this.calculateDevice(device.getId(), device);
        }
    }

    /**
     * Recalculate the device.
     *
     * @param deviceId
     * @param device
     * @returns {Promise<void>}
     */
    async calculateDevice(deviceId, device) {
        throw new Error('not implemented');
    }

    /**
     * Update sub zones, if master thermostat.
     *
     * @returns {Promise<void>}
     */
    async updateTargetTemperatures() {
        // TODO
    }

    /**
     * Switch all devices.
     *
     * @returns {Promise<void>}
     */
    async switchDevices() {
        for (let device of this._driver.getDevices()) {
            await this.switchDevice(device);
        }
    }

    /**
     * Switch a device.
     *
     * @param device
     * @returns {Promise<void>}
     */
    async switchDevice(device) {
        throw new Error('not implemented');
    }

    async _switch(device, node, onoff) {
        if (node.capabilitiesObj['vt_onoff'] === null ||
            node.capabilitiesObj['vt_onoff'].value !== onoff) {

            device.setCapabilityValue('vt_onoff', onoff)
                .catch(err => device.log(`update vt_onoff failed for ${node.id}`, err));

            if (onoff) {
                this._onTrigger.trigger(device, { state: 1 }, {});
                device.log(`Trigger: "${node.name}" => turned on`);
            } else {
                this._offTrigger.trigger(device, { state: 0 }, {});
                device.log(`Trigger: "${node.name}" => turned off`);
            }
        }

        for (let aNode of this._deviceHandler.getDevicesInZone(node.zone)) {
            if (this._shallSwitchDevice(aNode, onoff)) {
                await this._doSwitch(device, aNode, onoff)
            }
        }
    }

    _shallSwitchDevice(node, onoff) {
        return (node.class === this._clazz || node.virtualClass === this._clazz) &&
            node.capabilitiesObj &&
            node.capabilitiesObj.onoff.value !== onoff;
    }

    async _doSwitch(device, node, onoff) {

        const switchDevice = node.device;
        if (!switchDevice) {
            device.log(`_doSwitch: missing node.device for ${node.id}`);
            return;
        }

        const device_delay = device.getSetting('device_delay') || 0;

        if (device_delay > 0) {
            try {
                await switchDevice.setCapabilityValue('onoff', onoff);
                device.log(`Switched: "${node.name}" ${this._clazz} => ${onoff ? 'on' : 'off'}`)
            } catch (err) {
                device.log(`Switched: "${node.name}": FAILED`, err);
            } finally {
                await util.delay(device_delay);
            }
        } else {
            switchDevice.setCapabilityValue('onoff', onoff)
                .then(() => device.log(`Switched: "${node.name}" ${this._clazz} => ${onoff ? 'on' : 'off'}`))
                .catch(err => device.log(`Switched: "${node.name}": FAILED`, err));
        }
    }

};
