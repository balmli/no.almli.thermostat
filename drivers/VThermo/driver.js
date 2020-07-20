'use strict';

const Homey = require('homey');
const math = require('../../lib/math');

module.exports = class VThermoDriver extends Homey.Driver {

    onInit() {
        Homey.app.registerDriver(this);
    }

    onPairListDevices(data, callback) {
        let devices = [
            {
                "name": "VThermo",
                "data": {
                    "id": math.guid()
                }
            }
        ];
        callback(null, devices);
    }

};

