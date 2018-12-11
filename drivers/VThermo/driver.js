'use strict';

const Homey = require('homey');

class VThermoDriver extends Homey.Driver {

    onInit() {
        this.log('VThermo driver has been initialized');
    }

    onPairListDevices(data, callback) {
        let devices = [
            {
                "name": "VThermo",
                "data": {"id": "VThermo"}
            }
        ];
        callback(null, devices);
    }

}

module.exports = VThermoDriver;
