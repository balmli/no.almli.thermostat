'use strict';

const round = val => Math.round(val * 100) / 100;
const average = arr => arr.reduce((p, c) => p + c, 0) / arr.length;
const min = arr => Math.min(arr);
const max = arr => Math.max(arr);

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
    guid: guid
};
