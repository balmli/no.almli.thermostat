const expect = require("chai").expect;
const assert = require("chai").assert;
const devs = require('./devs');
const humidityLib = require('../lib/humidity');

const devices = devs.getDevices();

describe("switchFanDevices", function () {
    describe("Check undefined", function () {
        it("Check undefined", async function () {
            const device = devs.getDevice();
            const r = await humidityLib.switchFanDevices(device, '1815c884-af06-4d53-a2c1-6f4c77e9eb4e', devices, undefined);
            assert.isUndefined(r.onoff);
        });
    });

    describe("Switch Room 2", function () {
        it("Switch on", async function () {
            const device = devs.getDevice();
            const r = await humidityLib.switchFanDevices(device, '1815c884-af06-4d53-a2c1-6f4c77e9eb4e', devices, true);
            expect(r.onoff).to.equal(true);
            expect(device.getCapabilityValue('vt_onoff')).to.equal(true);
            expect(devices['5b135d2e-125e-417a-bde2-435f413f77e3'].capabilitiesObj.onoff.value).to.equal(true);
            let logs = r.device.getLog();
            expect(logs.length).to.equal(2);
            expect(logs[logs.length - 2]).to.equal('trigged fan turned on');
            expect(logs[logs.length - 1]).to.equal('Room 2 Wallplug 2 set to true');
        });

        it("Switch off", async function () {
            const device = devs.getDevice();
            const r = await humidityLib.switchFanDevices(device, '1815c884-af06-4d53-a2c1-6f4c77e9eb4e', devices, false);
            expect(r.onoff).to.equal(false);
            expect(device.getCapabilityValue('vt_onoff')).to.equal(false);
            expect(devices['5b135d2e-125e-417a-bde2-435f413f77e3'].capabilitiesObj.onoff.value).to.equal(false);
            let logs = r.device.getLog();
            expect(logs.length).to.equal(2);
            expect(logs[logs.length - 2]).to.equal('trigged fan turned off');
            expect(logs[logs.length - 1]).to.equal('Room 2 Wallplug 2 set to false');
        });
    });

});
