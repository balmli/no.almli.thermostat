const expect = require("chai").expect;
const assert = require("chai").assert;
const devs = require('./devs');
const temperatureLib = require('../lib/temperature');

describe("heater resolveOnoff", function () {
    describe("Check hysteresis undefined", function () {
        it("Should turn on", function () {
            const device = devs.getDevice();
            expect(temperatureLib.resolveOnoff(device, 10, 20, {hysteresis: undefined})).to.equal(true);
        });
        it("Should turn off", function () {
            const device = devs.getDevice();
            expect(temperatureLib.resolveOnoff(device, 20, 10, {hysteresis: undefined})).to.equal(false);
        });
    });

    describe("Check hysteresis 0.5", function () {
        it("Should turn on", function () {
            const device = devs.getDevice();
            expect(temperatureLib.resolveOnoff(device, 10, 20, {hysteresis: 0.5})).to.equal(true);
        });
        it("Should turn off", function () {
            const device = devs.getDevice();
            expect(temperatureLib.resolveOnoff(device, 20, 10, {hysteresis: 0.5})).to.equal(false);
        });

        it("Should turn on", function () {
            const device = devs.getDevice();
            expect(temperatureLib.resolveOnoff(device, 19.49, 20, {hysteresis: 0.5})).to.equal(true);
        });
        it("Should turn off", function () {
            const device = devs.getDevice();
            expect(temperatureLib.resolveOnoff(device, 20.51, 20, {hysteresis: 0.5})).to.equal(false);
        });
    });

    describe("Check invert undefined", function () {
        it("Should turn on", function () {
            const device = devs.getDevice();
            expect(temperatureLib.resolveOnoff(device, 10, 20, {hysteresis: 0.5, invert: undefined})).to.equal(true);
        });
        it("Should turn off", function () {
            const device = devs.getDevice();
            expect(temperatureLib.resolveOnoff(device, 20, 10, {hysteresis: 0.5, invert: undefined})).to.equal(false);
        });
    });

    describe("Check invert false", function () {
        it("Should turn on", function () {
            const device = devs.getDevice();
            expect(temperatureLib.resolveOnoff(device, 10, 20, {hysteresis: 0.5, invert: false})).to.equal(true);
        });
        it("Should turn off", function () {
            const device = devs.getDevice();
            expect(temperatureLib.resolveOnoff(device, 20, 10, {hysteresis: 0.5, invert: false})).to.equal(false);
        });
    });

    describe("Check invert true", function () {
        it("Should turn off", function () {
            const device = devs.getDevice();
            expect(temperatureLib.resolveOnoff(device, 10, 20, {hysteresis: 0.5, invert: true})).to.equal(false);
        });
        it("Should turn on", function () {
            const device = devs.getDevice();
            expect(temperatureLib.resolveOnoff(device, 20, 10, {hysteresis: 0.5, invert: true})).to.equal(true);
        });
    });

    describe("Check no change", function () {
        it("Equal", function () {
            const device = devs.getDevice();
            expect(temperatureLib.resolveOnoff(device, 20, 20, {hysteresis: 1})).to.equal(undefined);
        });
        it("Less", function () {
            const device = devs.getDevice();
            expect(temperatureLib.resolveOnoff(device, 20, 21, {hysteresis: 1})).to.equal(undefined);
        });
        it("Larger", function () {
            const device = devs.getDevice();
            expect(temperatureLib.resolveOnoff(device, 21, 20, {hysteresis: 1})).to.equal(undefined);
        });
        it("Less", function () {
            const device = devs.getDevice();
            expect(temperatureLib.resolveOnoff(device, 19.5, 20, {hysteresis: 0.5})).to.equal(undefined);
        });
        it("Larger", function () {
            const device = devs.getDevice();
            expect(temperatureLib.resolveOnoff(device, 20.5, 20, {hysteresis: 0.5})).to.equal(undefined);
        });
    });

    describe("Check with main switch on", function () {
        it("Should turn on", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('onoff', true);
            expect(temperatureLib.resolveOnoff(device, 10, 20, {hysteresis: 0.5})).to.equal(true);
        });
        it("Should turn off", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('onoff', true);
            expect(temperatureLib.resolveOnoff(device, 20, 10, {hysteresis: 0.5})).to.equal(false);
        });

        it("Should turn on", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('onoff', true);
            expect(temperatureLib.resolveOnoff(device, 19.49, 20, {hysteresis: 0.5})).to.equal(true);
        });
        it("Should turn off", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('onoff', true);
            expect(temperatureLib.resolveOnoff(device, 20.51, 20, {hysteresis: 0.5})).to.equal(false);
        });
    });

    describe("Check with main switch off", function () {
        it("Should turn off", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('onoff', false);
            device.setCapabilityValue('vt_onoff', true);
            expect(temperatureLib.resolveOnoff(device, 10, 20, {hysteresis: 0.5})).to.equal(false);
        });
        it("Should not switch", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('onoff', false);
            device.setCapabilityValue('vt_onoff', false);
            expect(temperatureLib.resolveOnoff(device, 20, 10, {hysteresis: 0.5})).to.equal(undefined);
        });
    });

    describe("Check with main switch opts on", function () {
        it("Should turn on", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('onoff', false);
            expect(temperatureLib.resolveOnoff(device, 10, 20, {hysteresis: 0.5}, {onoff: true})).to.equal(true);
        });
        it("Should turn off", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('onoff', false);
            expect(temperatureLib.resolveOnoff(device, 20, 10, {hysteresis: 0.5}, {onoff: true})).to.equal(false);
        });

        it("Should turn on", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('onoff', false);
            expect(temperatureLib.resolveOnoff(device, 19.49, 20, {hysteresis: 0.5}, {onoff: true})).to.equal(true);
        });
        it("Should turn off", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('onoff', false);
            expect(temperatureLib.resolveOnoff(device, 20.51, 20, {hysteresis: 0.5}, {onoff: true})).to.equal(false);
        });
    });

    describe("Check with main switch opts off", function () {
        it("Should turn off", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('onoff', true);
            device.setCapabilityValue('vt_onoff', true);
            expect(temperatureLib.resolveOnoff(device, 10, 20, {hysteresis: 0.5}, {onoff: false})).to.equal(false);
        });
        it("Should not switch", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('onoff', true);
            device.setCapabilityValue('vt_onoff', false);
            expect(temperatureLib.resolveOnoff(device, 20, 10, {hysteresis: 0.5}, {onoff: false})).to.equal(undefined);
        });
    });

    describe("Check contact alarm", function () {
        it("Should turn off", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('onoff', true);
            device.setCapabilityValue('vt_onoff', true);
            expect(temperatureLib.resolveOnoff(device, 20, 20, {hysteresis: 0.5}, undefined, true)).to.equal(false);
        });
        it("Should not switch if no contact alarm", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('onoff', true);
            device.setCapabilityValue('vt_onoff', true);
            expect(temperatureLib.resolveOnoff(device, 20, 20, {hysteresis: 0.5}, undefined, false)).to.equal(undefined);
        });
        it("Should not switch if already off", function () {
            const device = devs.getDevice();
            device.setCapabilityValue('onoff', true);
            device.setCapabilityValue('vt_onoff', false);
            expect(temperatureLib.resolveOnoff(device, 20, 20, {hysteresis: 0.5}, undefined, true)).to.equal(undefined);
        });
    });
});
