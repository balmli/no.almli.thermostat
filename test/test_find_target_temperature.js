const expect = require("chai").expect;
const assert = require('chai').assert;
const devs = require('./devs');
const temperatureLib = require('../lib/temperature');

describe("findTargetTemperature", function () {
    describe("Check undefined", function () {
        it("Check undefined", function () {
            const device = devs.getDevice();
            let tmp = temperatureLib.findTargetTemperature(device, undefined);
            assert.isUndefined(tmp);
            let logs = device.getLog();
            expect(logs[logs.length - 1]).to.equal('no target_temperature defined');
        });

        it("Check undefined from opts", function () {
            const device = devs.getDevice();
            let tmp = temperatureLib.findTargetTemperature(device, {target_temperature: undefined});
            assert.isUndefined(tmp);
            let logs = device.getLog();
            expect(logs[logs.length - 1]).to.equal('no target_temperature defined');
        });
    });

    describe("Check target temperature", function () {
        it("Check 19.0 from capability", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('target_temperature', 19.0);
            let tmp = temperatureLib.findTargetTemperature(device, undefined);
            expect(tmp).to.equal(19.0);
            let logs = device.getLog();
            expect(logs[logs.length - 1]).to.equal('target temperature');
        });

        it("Check 20.5 from opts", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('target_temperature', 19.0);
            let tmp = temperatureLib.findTargetTemperature(device, {target_temperature: 20.5});
            expect(tmp).to.equal(20.5);
            let logs = device.getLog();
            expect(logs[logs.length - 1]).to.equal('target temperature');
        });
    });

});
