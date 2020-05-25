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

let switchFanDevices = async function (aDevice, zoneId, devices, onoff, settings) {
    let device_delay = settings && settings.device_delay || 0;
    if (onoff !== undefined) {
        if (aDevice.getCapabilityValue('vt_onoff') !== onoff) {
            try {
                aDevice.setCapabilityValue('vt_onoff', onoff);
            } catch (error) {
                aDevice.log('error setting vt_onoff', error);
            }
            if (onoff) {
                aDevice._turnedOnTrigger.trigger(aDevice, { state: 1 }, {});
                aDevice.log('trigged fan turned on');
            } else {
                aDevice._turnedOffTrigger.trigger(aDevice, { state: 0 }, {});
                aDevice.log('trigged fan turned off');
            }
        }

        try {
            for (let device in devices) {
                let d = devices[device];
                if (d.zone === zoneId &&
                    (d.class === 'fan' || d.virtualClass === 'fan') &&
                    d.capabilitiesObj &&
                    d.capabilitiesObj.onoff.value !== onoff) {
                    if (device_delay > 0) {
                        try {
                            await d.setCapabilityValue('onoff', onoff);
                            aDevice.log(`${d.name} set to ${onoff}`);
                        } catch (err) {
                            aDevice.log(`${d.name}: error switching`, error);
                        } finally {
                            await _delay(device_delay);
                        }
                    } else {
                        d.setCapabilityValue('onoff', onoff)
                            .then(resp => {
                                aDevice.log(`${d.name} set to ${onoff}`);
                            })
                            .catch(err => {
                                aDevice.log(`${d.name}: error switching`, error);
                            });
                    }
                }
            }
        } catch (error2) {
            aDevice.log(`error switching`, error2);
        }
    }
    return {
        onoff: onoff,
        device: aDevice
    };
};

let resolveOnoff = function (aDevice, humidity, targetHumidity, settings, opts) {
    let mainOnoff = settings.onoff_enabled && aDevice.hasCapability('onoff') ?
      (opts && opts.onoff !== undefined ? opts.onoff : aDevice.getCapabilityValue('onoff')) : true;

    let onoff = undefined;
    if (!mainOnoff) {
        onoff = aDevice.getCapabilityValue('vt_onoff') === true ? false : undefined;
    } else {
        let hysteresis = settings.hysteresis || 1;
        let invert = settings.invert;
        if (humidity > (targetHumidity + hysteresis)) {
            onoff = invert !== true;
        } else if (humidity < (targetHumidity - hysteresis)) {
            onoff = invert === true;
        }
    }
    return onoff;
};

let _delay = (ms) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
};

module.exports = {
    findTargetHumidity: findTargetHumidity,
    findHumidity: findHumidity,
    switchFanDevices: switchFanDevices,
    resolveOnoff: resolveOnoff
};
