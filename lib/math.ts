const round = (val: number) => Math.round(val * 100) / 100;

const values = (arr: any[], measurementMaxAge?: number) => {
    const vals = arr.length <= 1 ? arr : arr
        .map(v => ({
            ...v,
            ts: typeof v.lastUpdated === 'number' ? v.lastUpdated : new Date(v.lastUpdated).getTime()
        }))
        .filter(v => !measurementMaxAge || ((Date.now() - v.ts) < measurementMaxAge));
    return vals.length < 1 ? newest(arr) : vals
        .map(v => v.value);
};

const average = (arr: any[], measurementMaxAge?: number) => {
    const vals = values(arr, measurementMaxAge);
    return vals.reduce((p: number, c: number) => p + c, 0) / vals.length;
}

const min = (arr: any[], measurementMaxAge?: number) => Math.min(...values(arr, measurementMaxAge));
const max = (arr: any[], measurementMaxAge?: number) => Math.max(...values(arr, measurementMaxAge));
const newest = (arr: any[]) => arr.map(v => ({
    ...v,
    ts: typeof v.lastUpdated === 'number' ? v.lastUpdated : new Date(v.lastUpdated).getTime()
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
