'use strict';

let findTargetHumidity = function (aDevice, opts) {
    let targetHumidity = opts && opts.vh_target_humidity ? opts.vh_target_humidity : undefined;
    if (!targetHumidity) {
        targetHumidity = aDevice.getCapabilityValue('vh_target_humidity');
    }
    if (!targetHumidity) {
        aDevice.log('no target humidity defined');
    } else {
        aDevice.log('target humidity', targetHumidity);
    }
    return targetHumidity;
};

let findHumidity = async function (aDevice, zoneId, devices) {
    let sumHumidity = 0;
    let numHumidity = 0;
    for (let device in devices) {
        let d = devices[device];
        if (d.zone === zoneId &&
            d.class === 'sensor' &&
            d.capabilitiesObj &&
            d.capabilitiesObj.measure_humidity) {
            sumHumidity += d.capabilitiesObj.measure_humidity.value;
            numHumidity++;
        }
    }
    if (numHumidity === 0) {
        await aDevice.setCapabilityValue('measure_humidity', null).catch(console.error);
        aDevice.log('no humidity sensor in zone', zoneId);
        return;
    }
    let humidity = sumHumidity / numHumidity;

    if (aDevice._humidityStore) {
        aDevice._humidityStore.addValue(humidity);
    }

    let currentHumidity = aDevice.getCapabilityValue('measure_humidity');
    if (currentHumidity === undefined || currentHumidity === null || currentHumidity !== humidity) {
        await aDevice.setCapabilityValue('measure_humidity', humidity).catch(console.error);
        aDevice._humidityChangedTrigger.trigger(aDevice, {
            humidity: humidity
        });
        aDevice.log('trigged humidity change', humidity);
    }
    aDevice.log('humidity', humidity);
    return humidity;
};

let switchFanDevices = async function (aDevice, zoneId, devices, onoff) {
    if (onoff !== undefined) {
        if (aDevice.getCapabilityValue('vt_onoff') !== onoff) {
            await aDevice.setCapabilityValue('vt_onoff', onoff).catch(console.error);
            if (onoff) {
                aDevice._turnedOnTrigger.trigger(aDevice);
                aDevice.log('trigged fan turned on');
            } else {
                aDevice._turnedOffTrigger.trigger(aDevice);
                aDevice.log('trigged fan turned off');
            }
        }
        for (let device in devices) {
            let d = devices[device];
            if (d.zone === zoneId &&
                (d.class === 'fan' || d.virtualClass === 'fan') &&
                d.capabilitiesObj &&
                d.capabilitiesObj.onoff.value !== onoff) {
                await d.setCapabilityValue('onoff', onoff).catch(console.error);
                aDevice.log(d.name + ' set to ' + onoff);
            }
        }
    }
    return {
        onoff: onoff,
        device: aDevice
    };
};

let resolveOnoff = function (humidity, targetHumidity, settings) {
    let hysteresis = settings.hysteresis || 1;
    let invert = settings.invert;
    let onoff = undefined;
    if (humidity > (targetHumidity + hysteresis)) {
        onoff = invert !== true;
    } else if (humidity < (targetHumidity - hysteresis)) {
        onoff = invert === true;
    }
    return onoff;
};

module.exports = {
    findTargetHumidity: findTargetHumidity,
    findHumidity: findHumidity,
    switchFanDevices: switchFanDevices,
    resolveOnoff: resolveOnoff
};
