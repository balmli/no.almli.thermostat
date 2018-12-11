'use strict';

const Homey = require('homey');

class VThermoApp extends Homey.App {

    /*
    getApi() {
        if (!this.api) {
            this.api = HomeyAPI.forCurrentHomey();
        }
        return this.api;
    }

    async getDevices() {
        return await this.api.devices.getDevices();
    }
    */

    async onInit() {
        this.log('VThermoApp is running...');
        //this.api = await this.getApi();
    }

}

module.exports = VThermoApp;