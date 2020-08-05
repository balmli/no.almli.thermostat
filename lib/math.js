'use strict';

const round = val => Math.round(val * 100) / 100;
const values = arr => arr.map(v => v.value);
const average = arr => values(arr).reduce((p, c) => p + c, 0) / arr.length;
const min = arr => Math.min(...values(arr));
const max = arr => Math.max(...values(arr));
const newest = arr => arr.map(v => ({
    ...v,
    ts: new Date(v.lastUpdated).getTime()
})).reduce((a, b) => a.ts > b.ts ? a : b).value;

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

module.exports = {
    round: round,
    average: average,
    min: min,
    max: max,
    newest: newest,
    guid: guid
};
