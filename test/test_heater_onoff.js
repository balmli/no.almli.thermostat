const expect = require("chai").expect;
const assert = require("chai").assert;
const devs = require('./devs');
const temperatureLib = require('../lib/temperature');

describe("heater resolveOnoff", function () {
    describe("Check hysteresis undefined", function () {
        it("Should turn on", function () {
            expect(temperatureLib.resolveOnoff(10, 20, {hysteresis: undefined})).to.equal(true);
        });
        it("Should turn off", function () {
            expect(temperatureLib.resolveOnoff(20, 10, {hysteresis: undefined})).to.equal(false);
        });
    });

    describe("Check hysteresis 0.5", function () {
        it("Should turn on", function () {
            expect(temperatureLib.resolveOnoff(10, 20, {hysteresis: 0.5})).to.equal(true);
        });
        it("Should turn off", function () {
            expect(temperatureLib.resolveOnoff(20, 10, {hysteresis: 0.5})).to.equal(false);
        });

        it("Should turn on", function () {
            expect(temperatureLib.resolveOnoff(19.49, 20, {hysteresis: 0.5})).to.equal(true);
        });
        it("Should turn off", function () {
            expect(temperatureLib.resolveOnoff(20.51, 20, {hysteresis: 0.5})).to.equal(false);
        });
    });

    describe("Check no change", function () {
        it("Equal", function () {
            expect(temperatureLib.resolveOnoff(20, 20, {hysteresis: 1})).to.equal(undefined);
        });
        it("Less", function () {
            expect(temperatureLib.resolveOnoff(20, 21, {hysteresis: 1})).to.equal(undefined);
        });
        it("Larger", function () {
            expect(temperatureLib.resolveOnoff(21, 20, {hysteresis: 1})).to.equal(undefined);
        });
        it("Less", function () {
            expect(temperatureLib.resolveOnoff(19.5, 20, {hysteresis: 0.5})).to.equal(undefined);
        });
        it("Larger", function () {
            expect(temperatureLib.resolveOnoff(20.5, 20, {hysteresis: 0.5})).to.equal(undefined);
        });
    });

});
