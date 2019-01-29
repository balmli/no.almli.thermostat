const expect = require("chai").expect;
const assert = require('chai').assert;
const devs = require('./devs');
const temperatureLib = require('../lib/temperature');

const devices = devs.getDevices();

describe("findTemperature", function () {
    describe("No temp sensor in zone", function () {
        it("Check undefined", function () {
            const device = devs.getDevice();
            let tmp = temperatureLib.findTemperature(device, 'no-such-zone', devices);
            assert.isUndefined(tmp);
            let logs = device.getLog();
            expect(logs[logs.length - 1]).to.equal('no temperature sensor in zone');
        });
    });

    describe("Check temp in zone", function () {
        it("Check temp 17.9", function () {
            const device = devs.getDevice();
            let tmp = temperatureLib.findTemperature(device, '9eb2975d-49ea-4033-8db0-105a3e982117', devices);
            expect(tmp).to.equal(17.9);
            let logs = device.getLog();
            expect(logs.length).to.equal(2);
            expect(logs[logs.length - 2]).to.equal('trigged temperature change');
            expect(logs[logs.length - 1]).to.equal('temperature');
        });

        it("Check temp 17.9 not changed", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('measure_temperature', 17.9);
            let tmp = temperatureLib.findTemperature(device, '9eb2975d-49ea-4033-8db0-105a3e982117', devices);
            expect(tmp).to.equal(17.9);
            let logs = device.getLog();
            expect(logs.length).to.equal(1);
            expect(logs[logs.length - 1]).to.equal('temperature');
        });

        it("Check 17.25 average", function () {
            const device = devs.getDevice();
            let tmp = temperatureLib.findTemperature(device, '1815c884-af06-4d53-a2c1-6f4c77e9eb4e', devices);
            expect(tmp).to.equal(17.25);
            let logs = device.getLog();
            expect(logs.length).to.equal(2);
            expect(logs[logs.length - 2]).to.equal('trigged temperature change');
            expect(logs[logs.length - 1]).to.equal('temperature');
        });
    });

});
