'use strict';

const Homey = require('homey'),
    devicesLib = require('../../lib/devices');

class VHumidityDriver extends Homey.Driver {

    onInit() {
        this.log('VHumidity driver has been initialized');
        this.checkDevices();
    }

    onPairListDevices(data, callback) {
        let devices = [
            {
                "name": "VHumidity",
                "data": {
                    "id": guid()
                }
            }
        ];
        callback(null, devices);
    }

    clearCheckDevices() {
        if (this.curTimeout) {
            clearTimeout(this.curTimeout);
            this.curTimeout = undefined;
        }
    }

    scheduleCheckDevices(seconds = 60) {
        this.clearCheckDevices();
        this.curTimeout = setTimeout(this.checkDevices.bind(this), seconds * 1000);
    }

    async checkDevices() {
        try {
            this.clearCheckDevices();
            let allDevices = await devicesLib.getDevices(this);
            for (let device of this.getDevices()) {
                device._devices = allDevices;
                await device.checkHumidity();
            }
        } catch (err) {
            this.log('checkDevices', err);
        } finally {
            this.scheduleCheckDevices();
        }
    }
}

module.exports = VHumidityDriver;

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
