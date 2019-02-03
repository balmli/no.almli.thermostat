'use strict';

let findTargetTemperature = function (aDevice, opts) {
    let targetTemp = opts && opts.target_temperature ? opts.target_temperature : undefined;
    if (!targetTemp) {
        targetTemp = aDevice.getCapabilityValue('target_temperature');
    }
    if (!targetTemp) {
        aDevice.log('no target_temperature defined');
    } else {
        aDevice.log('target temperature', targetTemp);
    }
    return targetTemp;
};

let findTemperature = function (aDevice, zoneId, devices) {
    let sumTemp = 0;
    let numTemp = 0;
    for (let device in devices) {
        let d = devices[device];
        if (d.zone === zoneId &&
            d.class === 'sensor' &&
            d.capabilitiesObj &&
            d.capabilitiesObj.measure_temperature) {
            sumTemp += d.capabilitiesObj.measure_temperature.value;
            numTemp++;
        }
    }
    if (numTemp === 0) {
        aDevice.setCapabilityValue('measure_temperature', null).catch(console.error);
        aDevice.log('no temperature sensor in zone', zoneId);
        return;
    }
    let temperature = sumTemp / numTemp;
    let currentTemperature = aDevice.getCapabilityValue('measure_temperature');
    if (currentTemperature === undefined || currentTemperature === null || currentTemperature !== temperature) {
        aDevice.setCapabilityValue('measure_temperature', temperature).catch(console.error);
        aDevice.log('trigged temperature change', temperature);
    }
    aDevice.log('temperature', temperature);
    return temperature;
};

let switchHeaterDevices = async function (aDevice, zoneId, devices, onoff) {
    if (onoff !== undefined) {
        aDevice.setCapabilityValue('vt_onoff', onoff).catch(console.error);
        for (let device in devices) {
            let d = devices[device];
            if (d.zone === zoneId &&
                (d.class === 'heater' || d.virtualClass === 'heater') &&
                d.capabilitiesObj &&
                d.capabilitiesObj.onoff.value !== onoff) {
                await d.setCapabilityValue('onoff', onoff).catch(console.error);
                aDevice.log(d.name + ' set to ' + onoff);
            }
        }
        if (onoff) {
            aDevice._turnedOnTrigger.trigger(aDevice);
            aDevice.log('trigged thermostat turned on');
        } else {
            aDevice._turnedOffTrigger.trigger(aDevice);
            aDevice.log('trigged thermostat turned off');
        }
    }
    return {
        onoff: onoff,
        device: aDevice
    };
};

let resolveOnoff = function (temperature, targetTemp, settings) {
    let hysteresis = settings.hysteresis || 0.5;
    let onoff = undefined;
    if (temperature > (targetTemp + hysteresis)) {
        onoff = false;
    } else if (temperature < (targetTemp - hysteresis)) {
        onoff = true;
    }
    return onoff;
};

module.exports = {
    findTargetTemperature: findTargetTemperature,
    findTemperature: findTemperature,
    switchHeaterDevices: switchHeaterDevices,
    resolveOnoff: resolveOnoff
};
