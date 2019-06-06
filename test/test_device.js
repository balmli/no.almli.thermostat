const expect = require("chai").expect;
const assert = require('chai').assert;
const devs = require('./devs');
const devicesLib = require('../lib/devices');

const devices = devs.getDevices();

describe("Logging", function () {
    describe("Logging", function () {
        it("Check", function () {
            const device = devs.getDevice();
            device.log("test");
            expect(device.getLog()[0]).to.equal("test");
        });
    });
});

describe("CapabilityValue", function () {
    describe("set get has test", function () {
        it("Check", function () {
            const device = devs.getDevice();
            assert.isFalse(device.hasCapability('measure_temperature'));
            device.setCapabilityValue('measure_temperature', null);
            assert.isTrue(device.hasCapability('measure_temperature'));
            assert.isNull(device.getCapabilityValue('measure_temperature'), 'measure_temperature is not null');
            device.setCapabilityValue('measure_temperature', 22.5);
            assert.isNotNull(device.getCapabilityValue('measure_temperature'), 'measure_temperature is null');
            expect(device.getCapabilityValue('measure_temperature')).to.equal(22.5);
        });
    });
});

describe("getDeviceByDeviceId", function () {
    describe("get tests", function () {
        it("Check device that does not exist", function () {
            const device = devicesLib.getDeviceByDeviceId('no-such-device', devices);
            assert.isUndefined(device);
        });

        it("Check device that exists", function () {
            const device = devicesLib.getDeviceByDeviceId('1c475740-6fc2-d308-80fe-1fc31f2a87b2', devices);
            expect(device.id).to.equal('1f4c5f56-150e-4ec8-9183-ef33022a5129');
            expect(device.zone).to.equal('9eb2975d-49ea-4033-8db0-105a3e982117');
        });
    });
});
