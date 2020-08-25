'use strict';

const Homey = require('homey');

module.exports = class BaseDevice extends Homey.Device {

    getId() {
        return this._id;
    }

    setId(id) {
        if (!this._id) {
            this._id = id;
        }
    }

    getDevicesSettings() {
        return {
            zone: {
                clazz: true
            }
        };
    }

};
