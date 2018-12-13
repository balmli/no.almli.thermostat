'use strict';

const Homey = require('homey');

class VThermoApp extends Homey.App {

    async onInit() {
        this.log('VThermoApp is running...');
    }

}

module.exports = VThermoApp;