const expect = require("chai").expect;
const assert = require("chai").assert;
const devs = require('./devs');
const humidityLib = require('../lib/humidity');

describe("fan resolveOnoff", function () {
    describe("Check invert undefined", function () {
        it("Should turn off", function () {
            const device = devs.getDevice();
            expect(humidityLib.resolveOnoff(device, 10, 20, {onoff_enabled: true, hysteresis: 1, invert: undefined})).to.equal(false);
        });
        it("Should turn on", function () {
            const device = devs.getDevice();
            expect(humidityLib.resolveOnoff(device, 20, 10, {onoff_enabled: true, hysteresis: 1, invert: undefined})).to.equal(true);
        });
    });

    describe("Check invert false", function () {
        it("Should turn off", function () {
            const device = devs.getDevice();
            expect(humidityLib.resolveOnoff(device, 10, 20, {onoff_enabled: true, hysteresis: 1, invert: false})).to.equal(false);
        });
        it("Should turn on", function () {
            const device = devs.getDevice();
            expect(humidityLib.resolveOnoff(device, 20, 10, {onoff_enabled: true, hysteresis: 1, invert: false})).to.equal(true);
        });
    });

    describe("Check invert true", function () {
        it("Should turn on", function () {
            const device = devs.getDevice();
            expect(humidityLib.resolveOnoff(device, 10, 20, {onoff_enabled: true, hysteresis: 1, invert: true})).to.equal(true);
        });
        it("Should turn off", function () {
            const device = devs.getDevice();
            expect(humidityLib.resolveOnoff(device, 20, 10, {onoff_enabled: true, hysteresis: 1, invert: true})).to.equal(false);
        });
    });

    describe("Check no change", function () {
        it("Equal", function () {
            const device = devs.getDevice();
            expect(humidityLib.resolveOnoff(device, 20, 20, {onoff_enabled: true, hysteresis: 1, invert: false})).to.equal(undefined);
        });
        it("Less", function () {
            const device = devs.getDevice();
            expect(humidityLib.resolveOnoff(device, 20, 21, {onoff_enabled: true, hysteresis: 1, invert: false})).to.equal(undefined);
        });
        it("Larger", function () {
            const device = devs.getDevice();
            expect(humidityLib.resolveOnoff(device, 21, 20, {onoff_enabled: true, hysteresis: 1, invert: false})).to.equal(undefined);
        });
        it("Less", function () {
            const device = devs.getDevice();
            expect(humidityLib.resolveOnoff(device, 20.5, 21, {onoff_enabled: true, hysteresis: 0.5, invert: false})).to.equal(undefined);
        });
        it("Larger", function () {
            const device = devs.getDevice();
            expect(humidityLib.resolveOnoff(device, 21, 20.5, {onoff_enabled: true, hysteresis: 0.5, invert: false})).to.equal(undefined);
        });
    });

});
