const expect = require("chai").expect;
const assert = require('chai').assert;
const devs = require('./devs');
const humidityLib = require('../lib/humidity');

describe("findTargetHumidity", function () {
    describe("Check undefined", function () {
        it("Check undefined", function () {
            const device = devs.getDevice();
            let tmp = humidityLib.findTargetHumidity(device, undefined);
            assert.isUndefined(tmp);
            let logs = device.getLog();
            expect(logs[logs.length - 1]).to.equal('no target humidity defined');
        });

        it("Check undefined from opts", function () {
            const device = devs.getDevice();
            let tmp = humidityLib.findTargetHumidity(device, {vh_target_humidity: undefined});
            assert.isUndefined(tmp);
            let logs = device.getLog();
            expect(logs[logs.length - 1]).to.equal('no target humidity defined');
        });
    });

    describe("Check target humidity", function () {
        it("Check 40.0 from capability", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('vh_target_humidity', 40.0);
            let tmp = humidityLib.findTargetHumidity(device, undefined);
            expect(tmp).to.equal(40.0);
            let logs = device.getLog();
            expect(logs[logs.length - 1]).to.equal('target humidity');
        });

        it("Check 45.5 from opts", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('vh_target_humidity', 40.0);
            let tmp = humidityLib.findTargetHumidity(device, {vh_target_humidity: 45.5});
            expect(tmp).to.equal(45.5);
            let logs = device.getLog();
            expect(logs[logs.length - 1]).to.equal('target humidity');
        });
    });

});
