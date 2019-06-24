const expect = require("chai").expect;
const assert = require('chai').assert;
const ValueStore = require('../lib/value_store');

describe("ValueStore", function () {
    describe("ValueStore", function () {
        it("Check constructor", function () {
            const store = new ValueStore();
            const tsNow = 1561378572000;
            store.addValue(12, tsNow - 62 * 60000);
            store.addValue(14, tsNow - 60 * 60000);
            store.addValue(16, tsNow - 3 * 60000);
            store.addValue(18, tsNow - 60000);
            store.addValue(17, tsNow - 2 * 60000);
            store.addValue(15, tsNow - 59 * 60000);
            store.addValue(13, tsNow - 61 * 60000);
            expect(store.size()).to.equal(6);
            store.clearOldEntries(tsNow);
            expect(store.size()).to.equal(5);

            expect(store.sameAgeOrOlderThan(tsNow - 3 * 60000).value).to.equal(16);

            expect(store.changePctPointsLastMinutes(3, tsNow)).to.equal(2.0);
            expect(store.changePctPointsLastMinutes(60, tsNow)).to.equal(4.0);
        });
    });
});
