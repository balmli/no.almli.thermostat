const expect = require("chai").expect;
const assert = require('chai').assert;
const devs = require('./devs');
const humidityLib = require('../lib/humidity');

const devices = devs.getDevices();

describe("findHumidity", function () {
    describe("No humidity sensor in zone", function () {
        it("Check undefined", async function () {
            const device = devs.getDevice();
            let tmp = await humidityLib.findHumidity(device, 'no-such-zone', devices);
            assert.isUndefined(tmp);
            let logs = device.getLog();
            expect(logs[logs.length - 1]).to.equal('no humidity sensor in zone');
        });
    });

    describe("Check humidity in zone", function () {
        it("Check humidity 30.0", async function () {
            const device = devs.getDevice();
            let tmp = await humidityLib.findHumidity(device, '9eb2975d-49ea-4033-8db0-105a3e982117', devices);
            expect(tmp).to.equal(30.0);
            let logs = device.getLog();
            expect(logs.length).to.equal(2);
            expect(logs[logs.length - 2]).to.equal('trigged humidity change');
            expect(logs[logs.length - 1]).to.equal('humidity');
        });

        it("Check humidity 30.0 not changed", async function () {
            const device = devs.getDevice();
            device.setCapabilityValue('measure_humidity', 30.0);
            let tmp = await humidityLib.findHumidity(device, '9eb2975d-49ea-4033-8db0-105a3e982117', devices);
            expect(tmp).to.equal(30.0);
            let logs = device.getLog();
            expect(logs.length).to.equal(1);
            expect(logs[logs.length - 1]).to.equal('humidity');
        });


        it("Check 35.0 average", async function () {
            const device = devs.getDevice();
            let tmp = await humidityLib.findHumidity(device, '1815c884-af06-4d53-a2c1-6f4c77e9eb4e', devices);
            expect(tmp).to.equal(35.0);
            let logs = device.getLog();
            expect(logs.length).to.equal(2);
            expect(logs[logs.length - 2]).to.equal('trigged humidity change');
            expect(logs[logs.length - 1]).to.equal('humidity');
        });
    });

});
