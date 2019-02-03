const expect = require("chai").expect;
const assert = require("chai").assert;
const devs = require('./devs');
const humidityLib = require('../lib/humidity');

describe("fan resolveOnoff", function () {
    describe("Check invert undefined", function () {
        it("Should turn off", function () {
            expect(humidityLib.resolveOnoff(10, 20, {hysteresis: 1, invert: undefined})).to.equal(false);
        });
        it("Should turn on", function () {
            expect(humidityLib.resolveOnoff(20, 10, {hysteresis: 1, invert: undefined})).to.equal(true);
        });
    });

    describe("Check invert false", function () {
        it("Should turn off", function () {
            expect(humidityLib.resolveOnoff(10, 20, {hysteresis: 1, invert: false})).to.equal(false);
        });
        it("Should turn on", function () {
            expect(humidityLib.resolveOnoff(20, 10, {hysteresis: 1, invert: false})).to.equal(true);
        });
    });

    describe("Check invert true", function () {
        it("Should turn on", function () {
            expect(humidityLib.resolveOnoff(10, 20, {hysteresis: 1, invert: true})).to.equal(true);
        });
        it("Should turn off", function () {
            expect(humidityLib.resolveOnoff(20, 10, {hysteresis: 1, invert: true})).to.equal(false);
        });
    });

    describe("Check no change", function () {
        it("Equal", function () {
            expect(humidityLib.resolveOnoff(20, 20, {hysteresis: 1, invert: false})).to.equal(undefined);
        });
        it("Less", function () {
            expect(humidityLib.resolveOnoff(20, 21, {hysteresis: 1, invert: false})).to.equal(undefined);
        });
        it("Larger", function () {
            expect(humidityLib.resolveOnoff(21, 20, {hysteresis: 1, invert: false})).to.equal(undefined);
        });
        it("Less", function () {
            expect(humidityLib.resolveOnoff(20.5, 21, {hysteresis: 0.5, invert: false})).to.equal(undefined);
        });
        it("Larger", function () {
            expect(humidityLib.resolveOnoff(21, 20.5, {hysteresis: 0.5, invert: false})).to.equal(undefined);
        });
    });

});
