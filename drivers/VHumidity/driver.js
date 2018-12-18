'use strict';

const Homey = require('homey');

class VHumidityDriver extends Homey.Driver {

    onInit() {
        this.log('VHumidity driver has been initialized');
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

}

module.exports = VHumidityDriver;

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
