'use strict';

const Homey = require('homey');
const math = require('../../lib/math');

module.exports = class VHumidityDriver extends Homey.Driver {

    onPairListDevices(data, callback) {
        let devices = [
            {
                "name": "VHumidity",
                "data": {
                    "id": math.guid()
                }
            }
        ];
        callback(null, devices);
    }

};
