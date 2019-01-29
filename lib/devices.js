'use strict';

const {HomeyAPI} = require('athom-api');

let getApi = async function (aDevice) {
    if (!aDevice._api) {
        aDevice._api = await HomeyAPI.forCurrentHomey();
    }
    return aDevice._api;
};

let getDevices = async function (aDevice) {
    try {
        const api = await getApi(aDevice);
        return await api.devices.getDevices();
    } catch (error) {
        console.error(error);
    }
};

let getDeviceByDeviceId = function (deviceId, devices) {
    for (let device in devices) {
        let d = devices[device];
        if (d.data && d.data.id === deviceId) {
            return d;
        }
    }
    return undefined;
};

module.exports = {
    getDevices: getDevices,
    getDeviceByDeviceId: getDeviceByDeviceId
};
