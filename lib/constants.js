'use strict';

const DRIVER_VTHERMO = 'VThermo';
const DRIVER_VHUMIDITY = 'VHumidity';

const SUPPORTED_DRIVERS = [
    DRIVER_VTHERMO,
    DRIVER_VHUMIDITY
];

const SUPPORTED_CLASSES = [
    'fan',
    'heater',
    'sensor',
    'socket',
    'thermostat'
];

const SUPPORTED_CAPABILITIES = [
    'onoff',
    'measure_temperature',
    'measure_humidity',
    'target_temperature',
    'thermostat_mode',
    'vt_onoff',
    'vh_target_humidity'
];

const CALC_METHODS = {
    AVERAGE: "AVERAGE",
    MIN: "MIN",
    MAX: "MAX",
};

module.exports = {
    DRIVER_VTHERMO: DRIVER_VTHERMO,
    DRIVER_VHUMIDITY: DRIVER_VHUMIDITY,
    SUPPORTED_DRIVERS: SUPPORTED_DRIVERS,
    SUPPORTED_CLASSES: SUPPORTED_CLASSES,
    SUPPORTED_CAPABILITIES: SUPPORTED_CAPABILITIES,
    CALC_METHODS: CALC_METHODS
};
