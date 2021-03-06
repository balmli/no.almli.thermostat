'use strict';

const EventEmitter = require('events');
const constants = require('./constants');

module.exports = class DeviceHandler extends EventEmitter {

    constructor(options) {
        super();
        options = options || {};
        this.log = options.log || console.log;
        this.error = options.log || console.log;
        this._api = options.api;
        this._nodes = new Map();
        this._zones = new Map();
        this._capabilityInstances = new Map();

        this._api.apps.on('app.create', this._onAppUpdated.bind(this));
        this._api.apps.on('app.update', this._onAppUpdated.bind(this));
        this._api.apps.on('app.delete', this._onAppDeleted.bind(this));

        this._api.devices.on('device.update', this._onDeviceUpdate.bind(this));
        this._api.devices.on('device.delete', this._onDeviceDelete.bind(this));

        this._api.zones.on('zones.create', this._onZoneCreate.bind(this));
        this._api.zones.on('zones.update', this._onZoneUpdate.bind(this));
        this._api.zones.on('zones.delete', this._onZoneDelete.bind(this));
    }

    async _onAppUpdated(app) {
        if (app.ready && app.state === 'running') {
            this.log(`_onAppUpdated: ${app.id}`);
            this.registerDevices({ appFilter: app.id });
        }
    }

    async _onAppDeleted(app) {
        this.log(`_onAppDeleted: ${app.id}`);
    }

    async _onDeviceUpdate(deviceUpdated) {
        if (!deviceUpdated.ready) {
            return;
        }
        const { changedDevice } = this._hasNodeChanged(deviceUpdated);
        if (changedDevice) {
            //this.log('Updated device', deviceUpdated.id, deviceUpdated.name, deviceUpdated.capabilities);
            const device = await this._api.devices.getDevice({ id: deviceUpdated.id });
            await this._registerDevice(device);
        }
    }

    async _onDeviceDelete(deviceDeleted) {
        this.log('Remove device', deviceDeleted);
        this._unregisterDevice(deviceDeleted.id);
        this.emit('device_unregistered', {
            id: deviceDeleted.id
        });
    }

    async _onZoneCreate(id) {
        this.log('Zone added', id);
        await this._getAndRegisterZone(id);
    }

    async _onZoneUpdate(id) {
        this.log('Zone updated', id);
        await this._getAndRegisterZone(id);
    }

    async _getAndRegisterZone(theDevice) {
        setTimeout(async () => {
            const zone = await this.api.zones.getZone({ id: theDevice.id });
            if (zone) {
                await this._registerZone(zone);
            }
        }, 1000);
    }

    async _onZoneDelete(zoneId) {
        this.log('Zone deleted', zoneId);
        if (!this._zones.has(zoneId)) {
            return;
        }
        this._zones.delete(zoneId);
        //this.log('Zone deleted', zoneId);
    }

    async registerDevices({ appFilter }) {
        const devices = await this._api.devices.getDevices();
        let numDevices = 0;
        if (devices) {
            for (let key in devices) {
                const device = devices[key];
                if (!appFilter || device.driverUri === `homey:app:${appFilter}`) {
                    this.log(`registerDevice: ${device.name} ${device.driverUri}`);
                    if (await this._registerDevice(device)) {
                        numDevices++;
                    }
                }
            }
        }
        const zones = await this._api.zones.getZones();
        let numZones = 0;
        if (zones) {
            for (let key in zones) {
                const zone = zones[key];
                if (await this._registerZone(zone)) {
                    numZones++;
                }
            }
        }

        this.log(`registerDevices: devices:${numDevices}, zones:${numZones} -> nodes:${this._nodes.size}, capInstances:${this._capabilityInstances.size}`);
        this.emit('devices_registered', {
            numDevices: numDevices
        });
    }

    _createNode(device, allData) {
        const node = {
            id: device.id,
            dataId: device.data && device.data.id ? device.data.id : undefined,
            name: device.name,
            driverId: device.driverId,
            zone: device.zone,
            available: device.available,
            class: device.class,
            virtualClass: device.virtualClass,
            capabilities: device.capabilities,
            capabilitiesObj: this._filterCapabilities(device),
            device: allData ? device : undefined
        };
        this._nodes.set(device.id, node);
        return node;
    }

    _hasNodeChanged(device) {
        const node = this._nodes.get(device.id);
        let changedDevice = !this._nodes.has(device.id) ||
            node && node.name !== device.name ||
            node && node.zone !== device.zone ||
            node && node.available !== device.available ||
            node && node.class !== device.class ||
            node && device.virtualClass && node.virtualClass !== device.virtualClass ||
            node && node.capabilities.length !== device.capabilities.length ||
            node && node.capabilities.slice().sort().join(",") !== device.capabilities.slice().sort().join(",");
        if (changedDevice && this._nodes.has(device.id)) {
            this.log('Node has changed', node.name, node.zone, node.class, node.virtualClass, device.class, device.virtualClass);
        }
        return { node, changedDevice };
    }

    _filterCapabilities(device) {
        const capabilitiesObj = {};
        const capabilities = device.capabilitiesObj;
        if (capabilities) {
            for (let key in capabilities) {
                if (capabilities.hasOwnProperty(key) &&
                    constants.SUPPORTED_CAPABILITIES.includes(key)) {
                    capabilitiesObj[key] = capabilities[key];
                }
            }
        }
        return capabilitiesObj;
    }

    _storeValue(deviceId, capId, value) {
        if (this._nodes.has(deviceId)) {
            const node = this._nodes.get(deviceId);
            if (node.capabilitiesObj[capId]) {
                const zone = this.getZone(node.zone);
                node.capabilitiesObj[capId].value = value;
                this.log(`Store: "${zone ? zone.name : node.zone}:${node.name}:${capId}" => ${value}`);
            }
        }
    }

    async _registerDevice(device) {
        if (!device ||
            typeof device !== 'object' ||
            !device.id ||
            !device.name ||
            !device.available ||
            !device.capabilities ||
            !device.capabilitiesObj) {
            //this.log('Invalid device', device.id, device.name, device.capabilities, device.capabilitiesObj);
            return;
        }

        if (!constants.SUPPORTED_CLASSES.includes(device.class) &&
            !device.capabilitiesObj['measure_temperature'] &&
            !device.capabilitiesObj['alarm_contact'] &&
            !device.capabilitiesObj['alarm_motion']
        ) {
            return;
        }

        let createNode = false;
        const capabilities = device.capabilitiesObj;
        for (let key in capabilities) {
            if (capabilities.hasOwnProperty(key) &&
                constants.SUPPORTED_CAPABILITIES.includes(key)) {
                const capability = capabilities[key];
                this._registerCapability(device, capability, key);
                createNode = true;
            }
        }

        if (createNode) {
            const node = this._createNode(device, device.class !== 'sensor');
            this.log(`Registered device: ${device.id} ${device.name} ${device.class} ${Object.keys(node.capabilitiesObj).length} capabilties.`);
            if (constants.SUPPORTED_DRIVERS.includes(device.driverId)) {
                this.emit('device_registered', {
                    id: device.id,
                    dataId: device.data.id
                });
            }
            return true;
        }
    }

    _registerCapability(device, capability, capabilityKey) {
        try {
            const deviceCapabilityId = device.id + capability.id;
            this._destroyCapabilityInstance(deviceCapabilityId);
            device.setMaxListeners(100);
            const capabilityInstance = device.makeCapabilityInstance(capabilityKey, value => {
                this._storeValue(device.id, capability.id, value);
                this.emit('capability', {
                    id: device.id,
                    name: device.name,
                    capability: capability,
                    capId: capability.id,
                    value: value
                });
            });
            this._capabilityInstances.set(deviceCapabilityId, capabilityInstance);
            //this.log("Registered capability instance", device.name, capability.title, capability.type);
        } catch (e) {
            this.error("Error capability: " + capabilityKey, e);
        }
    }

    _destroyCapabilityInstance(deviceCapabilityId) {
        const capabilityInstance = this._capabilityInstances.get(deviceCapabilityId);
        if (capabilityInstance) {
            capabilityInstance.destroy();
            this._capabilityInstances.delete(deviceCapabilityId);
            //this.log("Destroyed capability instance", deviceCapabilityId);
        }
    }

    unregisterDevices() {
        this.log("Unregister devices");
        for (let id of this._nodes.keys()) {
            try {
                this._unregisterDevice(id);
            } catch (e) {
                this.error('Failed to unregister device', id, e);
            }
        }
        this._nodes.clear();
    }

    _unregisterDevice(deviceId) {
        if (!this._nodes.has(deviceId)) {
            return;
        }

        const node = this._nodes.get(deviceId);
        const deviceCaps = node.capabilities;
        if (deviceCaps) {
            if (deviceCaps) {
                for (let capabilityId of deviceCaps) {
                    this._destroyCapabilityInstance(deviceId + capabilityId);
                }
            }
        }

        this._nodes.delete(deviceId);
    }

    _createZone(zone) {
        const node = {
            id: zone.id,
            name: zone.name,
            parent: zone.parent
        };
        this._zones.set(zone.id, node);
    }

    async _registerZone(zone) {
        this.log(`Register zone: ${zone.id} ${zone.name}`);
        this._createZone(zone);
        return true;
    }

    getDevice(deviceId) {
        if (this._nodes.has(deviceId)) {
            return this._nodes.get(deviceId);
        }
        this.log(`getDevice(${deviceId}) -> no such node`);
    }

    getDeviceByDataId(dataId) {
        return Array.from(this._nodes.values())
            .find(node => node.dataId === zoneId);
    }

    getDevicesInZone(zoneId) {
        return Array.from(this._nodes.values())
            .filter(node => node.zone === zoneId);
    }

    getZone(zoneId) {
        return this._zones.get(zoneId);
    }

    getParentZone(zoneId) {
        if (this._zones.has(zoneId)) {
            return this._zones.get(zoneId).parent;
        }
    }

    getChildrenZones(zoneId) {
        return Array.from(this._zones.values())
            .filter(node => node.parent === zoneId)
            .map(node => node.id);
    }

    getDevicesInZoneAndSubZones(zoneId, devices) {
        if (!devices) {
            devices = [];
        }
        devices.push(...this.getDevicesInZone(zoneId));
        const childrenZones = this.getChildrenZones(zoneId);
        for (let childZone of childrenZones) {
            this.getDevicesInZoneAndSubZones(childZone, devices);
        }
        return devices;
    }

    getDevices(zone, devicesSettings, clazz) {
        const devices = [];
        if (zone && devicesSettings) {
            const zones = Array.isArray(zone) ? zone : [zone];
            for (let z of zones) {
                devices.push(...this.getDevicesInZone(z)
                    .filter(d => devicesSettings.clazz && (d.class === clazz || d.virtualClass === clazz) ||
                        devicesSettings.thermostats && d.class === 'thermostat' && d.driverId !== constants.DRIVER_VTHERMO)
                    .filter(device => device.capabilitiesObj['onoff']));
            }
        }
        return devices;
    }

    getTemperatures(zone, tempSettings) {
        const temperatures = [];
        if (zone && tempSettings) {
            const zones = Array.isArray(zone) ? zone : [zone];
            for (let z of zones) {
                temperatures.push(...this.getDevicesInZone(z)
                    .filter(d => tempSettings.sensor && d.class === 'sensor' ||
                        tempSettings.thermostat && d.class === 'thermostat' && d.driverId !== constants.DRIVER_VTHERMO ||
                        tempSettings.vthermo && d.class === 'thermostat' && d.driverId === constants.DRIVER_VTHERMO ||
                        tempSettings.other && d.class !== 'sensor' && d.class !== 'thermostat')
                    .filter(device => device.capabilitiesObj['measure_temperature'])
                    .map(device => {
                        return {
                            value: device.capabilitiesObj['measure_temperature'].value,
                            lastUpdated: device.capabilitiesObj['measure_temperature'].lastUpdated
                        };
                    }));
            }
        }
        return temperatures;
    }

    getHumidities(zone) {
        const humidities = [];
        if (zone) {
            const zones = Array.isArray(zone) ? zone : [zone];
            for (let z of zones) {
                humidities.push(...this.getDevicesInZone(z)
                    .filter(d => d.class === 'sensor')
                    .filter(device => device.capabilitiesObj['measure_humidity'])
                    .map(device => {
                        return {
                            value: device.capabilitiesObj['measure_humidity'].value,
                            lastUpdated: device.capabilitiesObj['measure_humidity'].lastUpdated
                        }
                    }));
            }
            //this.log(`getHumidities:`, zone, humidities);
        }
        return humidities;
    }

    hasContactAlarm(zone) {
        if (zone) {
            const zones = Array.isArray(zone) ? zone : [zone];
            for (let z of zones) {
                if (this.getDevicesInZone(z)
                    .filter(d => d.class === 'sensor')
                    .filter(device => device.capabilitiesObj['alarm_contact'])
                    .filter(device => device.capabilitiesObj['alarm_contact'].value === true)
                    .length > 0) {
                    return true;
                }
            }
        }
        return false;
    }

    hasMotionAlarm(zone) {
        if (zone) {
            const zones = Array.isArray(zone) ? zone : [zone];
            for (let z of zones) {
                if (this.getDevicesInZone(z)
                    .filter(d => d.class === 'sensor')
                    .filter(device => device.capabilitiesObj['alarm_motion'])
                    .filter(device => device.capabilitiesObj['alarm_motion'].value === true)
                    .length > 0) {
                    return true;
                }
            }
        }
        return false;
    }

    destroy() {
    }

};
