const expect = require("chai").expect;
const assert = require("chai").assert;
const devs = require('./devs');
const temperatureLib = require('../lib/temperature');

const devices = devs.getDevices();

describe("switchHeaterDevices", function () {
    describe("Check undefined", function () {
        it("Check undefined", function () {
            const device = devs.getDevice();
            temperatureLib.switchHeaterDevices(device, '9eb2975d-49ea-4033-8db0-105a3e982117', devices, undefined)
                .then(r => {
                    assert.isUndefined(r.onoff);
                });
        });
    });

    describe("Switch Room 1", function () {
        it("Switch on", function () {
            const device = devs.getDevice();
            temperatureLib.switchHeaterDevices(device, '9eb2975d-49ea-4033-8db0-105a3e982117', devices, true)
                .then(r => {
                    expect(r.onoff).to.equal(true);
                    expect(device.getCapabilityValue('vt_onoff')).to.equal(true);
                    expect(devices['0afda5c4-5f67-42be-959e-dae52e0af455'].capabilitiesObj.onoff.value).to.equal(true);
                    expect(devices['a9f6d4d7-9f69-4fb6-96a2-dd405969c24f'].capabilitiesObj.onoff.value).to.equal(true);
                    let logs = r.device.getLog();
                    expect(logs.length).to.equal(3);
                    expect(logs[logs.length - 3]).to.equal('Room 1 Wallplug 1 set to true');
                    expect(logs[logs.length - 2]).to.equal('Room 1 Wallplug 2 set to true');
                    expect(logs[logs.length - 1]).to.equal('trigged thermostat turned on');
                });
        });

        it("Switch off", function () {
            const device = devs.getDevice();
            temperatureLib.switchHeaterDevices(device, '9eb2975d-49ea-4033-8db0-105a3e982117', devices, false)
                .then(r => {
                    expect(r.onoff).to.equal(false);
                    expect(device.getCapabilityValue('vt_onoff')).to.equal(false);
                    expect(devices['0afda5c4-5f67-42be-959e-dae52e0af455'].capabilitiesObj.onoff.value).to.equal(false);
                    expect(devices['a9f6d4d7-9f69-4fb6-96a2-dd405969c24f'].capabilitiesObj.onoff.value).to.equal(false);
                    let logs = r.device.getLog();
                    expect(logs.length).to.equal(3);
                    expect(logs[logs.length - 3]).to.equal('Room 1 Wallplug 1 set to false');
                    expect(logs[logs.length - 2]).to.equal('Room 1 Wallplug 2 set to false');
                    expect(logs[logs.length - 1]).to.equal('trigged thermostat turned off');
                });

        });
    });

    describe("Switch Room 2", function () {
        it("Switch on", function () {
            const device = devs.getDevice();
            temperatureLib.switchHeaterDevices(device, '1815c884-af06-4d53-a2c1-6f4c77e9eb4e', devices, true)
                .then(r => {
                    expect(r.onoff).to.equal(true);
                    expect(device.getCapabilityValue('vt_onoff')).to.equal(true);
                    expect(devices['5b135d2e-125e-417a-bde2-435f413f77e2'].capabilitiesObj.onoff.value).to.equal(true);
                    let logs = r.device.getLog();
                    expect(logs.length).to.equal(2);
                    expect(logs[logs.length - 2]).to.equal('Room 2 Wallplug 1 set to true');
                    expect(logs[logs.length - 1]).to.equal('trigged thermostat turned on');
                });
        });

        it("Switch off", function () {
            const device = devs.getDevice();
            temperatureLib.switchHeaterDevices(device, '1815c884-af06-4d53-a2c1-6f4c77e9eb4e', devices, false)
                .then(r => {
                    expect(r.onoff).to.equal(false);
                    expect(device.getCapabilityValue('vt_onoff')).to.equal(false);
                    expect(devices['5b135d2e-125e-417a-bde2-435f413f77e2'].capabilitiesObj.onoff.value).to.equal(false);
                    let logs = r.device.getLog();
                    expect(logs.length).to.equal(2);
                    expect(logs[logs.length - 2]).to.equal('Room 2 Wallplug 1 set to false');
                    expect(logs[logs.length - 1]).to.equal('trigged thermostat turned off');
                });

        });
    });

});
