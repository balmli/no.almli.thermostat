'use strict';

const getDevice = function () {
    let logs = [];
    let capabilities = {};
    return {
        log: function (msg, ...msg2) {
            logs.push(msg);
            //console.log(msg, msg2);
        },
        getLog: function () {
            return logs;
        },
        clearLog: function () {
            logs = [];
        },
        setCapabilityValue: function (cap, value) {
            capabilities[cap] = value;
            return Promise.resolve();
        },
        getCapabilityValue: function (cap) {
            return capabilities[cap];
        },
        _turnedOnTrigger: {
            trigger: function (device) {
            }
        },
        _turnedOffTrigger: {
            trigger: function (device) {
            }
        },
        _humidityChangedTrigger: {
            trigger: function (device) {
            }
        }
    };
};

const getDevices = function () {
    let devices = {
        "0afda5c4-5f67-42be-959e-dae52e0af455": {
            "__athom_api_type": "HomeyAPI.ManagerDevices.Device",
            "id": "0afda5c4-5f67-42be-959e-dae52e0af455",
            "name": "Room 1 Wallplug 1",
            "driverUri": "homey:app:com.fibaro",
            "driverId": "FGWPx-102-PLUS",
            "zone": "9eb2975d-49ea-4033-8db0-105a3e982117",
            "icon": "/icon.svg",
            "iconObj": {
                "id": "247c6a866eede5a63eb32c2c1de59f93",
                "url": "/icon/247c6a866eede5a63eb32c2c1de59f93/icon.svg"
            },
            "settings": {
                "always_on": false,
                "save_state": true,
                "watt_interval_report": 30,
                "watt_threshold_report": 15,
                "immediate_watt_percent_report": 80,
                "own_power": false,
                "kwh_threshold_report": 0.01,
                "watt_kwh_report_interval": 3600,
                "led_ring_color_on": "4",
                "led_ring_color_off": "0",
                "control_onoff_group2": "0",
                "zw_node_id": "60",
                "zw_manufacturer_id": "271",
                "zw_product_type_id": "1538",
                "zw_product_id": "4099",
                "zw_secure": "manager.vdevice.drivers.zwavebasic.devicesettings.yes_true",
                "zw_battery": "manager.vdevice.drivers.zwavebasic.devicesettings.yes_false",
                "zw_device_class_basic": "BASIC_TYPE_ROUTING_SLAVE",
                "zw_device_class_generic": "GENERIC_TYPE_SWITCH_BINARY",
                "zw_device_class_specific": "SPECIFIC_TYPE_POWER_SWITCH_BINARY",
                "zw_firmware_id": "1554",
                "zw_wakeup_interval": 0,
                "zw_group_1": "1",
                "zw_group_2": "",
                "zw_group_3": "",
                "zw_configuration_value": ""
            },
            "settingsObj": true,
            "class": "socket",
            "virtualClass": "heater",
            "capabilities": [
                "measure_power",
                "meter_power",
                "onoff"
            ],
            "capabilitiesObj": {
                "measure_power": {
                    "value": 0,
                    "lastUpdated": "2019-01-29T08:06:19.855Z",
                    "type": "number",
                    "getable": true,
                    "setable": false,
                    "title": "Power",
                    "desc": "Power in Watt (W)",
                    "units": "W",
                    "decimals": 2,
                    "chartType": "stepLine",
                    "id": "measure_power",
                    "options": {}
                },
                "meter_power": {
                    "value": 718.58,
                    "lastUpdated": "2019-01-29T07:55:18.879Z",
                    "type": "number",
                    "getable": true,
                    "setable": false,
                    "title": "Power Meter",
                    "desc": "Power usage in KiloWattHour (kWh)",
                    "units": "KWh",
                    "decimals": 2,
                    "chartType": "spline",
                    "id": "meter_power",
                    "options": {}
                },
                "onoff": {
                    "value": false,
                    "lastUpdated": "2019-01-29T07:06:20.954Z",
                    "type": "boolean",
                    "getable": true,
                    "setable": true,
                    "title": "Turned on",
                    "desc": null,
                    "units": null,
                    "id": "onoff",
                    "options": {}
                }
            },
            "flags": [
                "zwave"
            ],
            "ui": {
                "quickAction": "onoff",
                "components": [
                    {
                        "id": "toggle",
                        "capabilities": [
                            "onoff"
                        ]
                    },
                    {
                        "id": "sensor",
                        "capabilities": [
                            "measure_power",
                            "meter_power"
                        ]
                    }
                ],
                "componentsStartAt": 1
            },
            "ready": true,
            "available": true,
            "repair": false,
            "unpair": true,
            "speechExamples": [
                "Turn all lights on",
                "Turn off all devices",
                "Toggle all lights"
            ],
            "images": [],
            "insights": [
                {
                    "uri": "homey:device:0afda5c4-5f67-42be-959e-dae52e0af455",
                    "id": "measure_power",
                    "type": "number",
                    "title": "Power",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "W"
                },
                {
                    "uri": "homey:device:0afda5c4-5f67-42be-959e-dae52e0af455",
                    "id": "meter_power",
                    "type": "number",
                    "title": "Power Meter",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "KWh"
                },
                {
                    "uri": "homey:device:0afda5c4-5f67-42be-959e-dae52e0af455",
                    "id": "onoff",
                    "type": "boolean",
                    "title": "Turned on",
                    "titleTrue": "Turned on",
                    "titleFalse": "Turned off",
                    "units": null,
                    "decimals": null
                }
            ],
            "color": "#000000",
            "data": {
                "token": "778d3160-64f1-447e-83ae-d1a297c0055e"
            }
        },
        "a9f6d4d7-9f69-4fb6-96a2-dd405969c24f": {
            "__athom_api_type": "HomeyAPI.ManagerDevices.Device",
            "id": "a9f6d4d7-9f69-4fb6-96a2-dd405969c24f",
            "name": "Room 1 Wallplug 2",
            "driverUri": "homey:app:com.fibaro",
            "driverId": "FGWPx-102-PLUS",
            "zone": "9eb2975d-49ea-4033-8db0-105a3e982117",
            "icon": "/icon.svg",
            "iconObj": {
                "id": "247c6a866eede5a63eb32c2c1de59f93",
                "url": "/icon/247c6a866eede5a63eb32c2c1de59f93/icon.svg"
            },
            "settings": {
                "always_on": false,
                "save_state": true,
                "watt_interval_report": 30,
                "watt_threshold_report": 15,
                "immediate_watt_percent_report": 80,
                "own_power": false,
                "kwh_threshold_report": 0.01,
                "watt_kwh_report_interval": 3600,
                "led_ring_color_on": "4",
                "led_ring_color_off": "0",
                "control_onoff_group2": "0",
                "zw_node_id": "61",
                "zw_manufacturer_id": "271",
                "zw_product_type_id": "1538",
                "zw_product_id": "4097",
                "zw_secure": "manager.vdevice.drivers.zwavebasic.devicesettings.yes_true",
                "zw_battery": "manager.vdevice.drivers.zwavebasic.devicesettings.yes_false",
                "zw_device_class_basic": "BASIC_TYPE_ROUTING_SLAVE",
                "zw_device_class_generic": "GENERIC_TYPE_SWITCH_BINARY",
                "zw_device_class_specific": "SPECIFIC_TYPE_POWER_SWITCH_BINARY",
                "zw_firmware_id": "1554",
                "zw_wakeup_interval": 0,
                "zw_group_1": "1",
                "zw_group_2": "",
                "zw_group_3": "",
                "zw_configuration_value": ""
            },
            "settingsObj": true,
            "class": "socket",
            "virtualClass": "heater",
            "capabilities": [
                "measure_power",
                "meter_power",
                "onoff"
            ],
            "capabilitiesObj": {
                "measure_power": {
                    "value": 0,
                    "lastUpdated": "2019-01-29T08:06:21.667Z",
                    "type": "number",
                    "getable": true,
                    "setable": false,
                    "title": "Power",
                    "desc": "Power in Watt (W)",
                    "units": "W",
                    "decimals": 2,
                    "chartType": "stepLine",
                    "id": "measure_power",
                    "options": {}
                },
                "meter_power": {
                    "value": 607.04,
                    "lastUpdated": "2019-01-29T07:57:15.653Z",
                    "type": "number",
                    "getable": true,
                    "setable": false,
                    "title": "Power Meter",
                    "desc": "Power usage in KiloWattHour (kWh)",
                    "units": "KWh",
                    "decimals": 2,
                    "chartType": "spline",
                    "id": "meter_power",
                    "options": {}
                },
                "onoff": {
                    "value": false,
                    "lastUpdated": "2019-01-29T07:06:21.922Z",
                    "type": "boolean",
                    "getable": true,
                    "setable": true,
                    "title": "Turned on",
                    "desc": null,
                    "units": null,
                    "id": "onoff",
                    "options": {}
                }
            },
            "flags": [
                "zwave"
            ],
            "ui": {
                "quickAction": "onoff",
                "components": [
                    {
                        "id": "toggle",
                        "capabilities": [
                            "onoff"
                        ]
                    },
                    {
                        "id": "sensor",
                        "capabilities": [
                            "measure_power",
                            "meter_power"
                        ]
                    }
                ],
                "componentsStartAt": 1
            },
            "ready": true,
            "available": true,
            "repair": false,
            "unpair": true,
            "speechExamples": [
                "Turn all lights on",
                "Turn off all devices",
                "Toggle all lights"
            ],
            "images": [],
            "insights": [
                {
                    "uri": "homey:device:a9f6d4d7-9f69-4fb6-96a2-dd405969c24f",
                    "id": "measure_power",
                    "type": "number",
                    "title": "Power",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "W"
                },
                {
                    "uri": "homey:device:a9f6d4d7-9f69-4fb6-96a2-dd405969c24f",
                    "id": "meter_power",
                    "type": "number",
                    "title": "Power Meter",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "KWh"
                },
                {
                    "uri": "homey:device:a9f6d4d7-9f69-4fb6-96a2-dd405969c24f",
                    "id": "onoff",
                    "type": "boolean",
                    "title": "Turned on",
                    "titleTrue": "Turned on",
                    "titleFalse": "Turned off",
                    "units": null,
                    "decimals": null
                }
            ],
            "color": "#000000",
            "data": {
                "token": "4f5bf72f-fa02-47c6-ad2f-8fc451584415"
            }
        },
        "8cb3c93e-8132-423c-80ac-62b7243c6090": {
            "__athom_api_type": "HomeyAPI.ManagerDevices.Device",
            "id": "8cb3c93e-8132-423c-80ac-62b7243c6090",
            "name": "Room 1 Temperature",
            "driverUri": "homey:app:com.weather-sensors",
            "driverId": "temphum",
            "zone": "9eb2975d-49ea-4033-8db0-105a3e982117",
            "icon": null,
            "iconObj": {
                "id": "a2931cd8e2df971fe57a530d4b1b9574",
                "url": "/icon/a2931cd8e2df971fe57a530d4b1b9574/icon.svg"
            },
            "settings": {
                "protocol": "Alecto v3",
                "type": "WH2",
                "channel": "2",
                "id": "151",
                "update": "Tue Jan 29 2019 09:28:45 GMT+0100 (CET)",
                "offset_temperature": 0,
                "offset_humidity": 0
            },
            "settingsObj": true,
            "class": "sensor",
            "virtualClass": null,
            "capabilities": [
                "measure_temperature",
                "measure_humidity"
            ],
            "capabilitiesObj": {
                "measure_temperature": {
                    "value": 17.9,
                    "lastUpdated": "2019-01-29T08:26:21.327Z",
                    "type": "number",
                    "getable": true,
                    "setable": false,
                    "title": "Temperature",
                    "desc": null,
                    "units": "°C",
                    "decimals": 2,
                    "chartType": "spline",
                    "id": "measure_temperature",
                    "options": {}
                },
                "measure_humidity": {
                    "value": 30,
                    "lastUpdated": "2019-01-29T07:57:33.358Z",
                    "type": "number",
                    "getable": true,
                    "setable": false,
                    "title": "Humidity",
                    "desc": "Humidity in percent (%)",
                    "units": "%",
                    "decimals": 2,
                    "chartType": "spline",
                    "id": "measure_humidity",
                    "options": {}
                }
            },
            "flags": [],
            "ui": {
                "components": [
                    {
                        "id": "sensor",
                        "capabilities": [
                            "measure_temperature",
                            "measure_humidity"
                        ]
                    }
                ],
                "componentsStartAt": 0
            },
            "ready": true,
            "available": true,
            "repair": false,
            "unpair": false,
            "unavailableMessage": null,
            "speechExamples": [
                "What is the average temperature at home?",
                "What is the average humidity at home?"
            ],
            "images": [],
            "insights": [
                {
                    "uri": "homey:device:8cb3c93e-8132-423c-80ac-62b7243c6090",
                    "id": "measure_temperature",
                    "type": "number",
                    "title": "Temperature",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "°C"
                },
                {
                    "uri": "homey:device:8cb3c93e-8132-423c-80ac-62b7243c6090",
                    "id": "measure_humidity",
                    "type": "number",
                    "title": "Humidity",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "%"
                }
            ],
            "color": "#df2029",
            "data": {
                "id": "alectov3:151:2",
                "type": "TH"
            }
        },
        "1f4c5f56-150e-4ec8-9183-ef33022a5129": {
            "__athom_api_type": "HomeyAPI.ManagerDevices.Device",
            "id": "1f4c5f56-150e-4ec8-9183-ef33022a5129",
            "name": "Room 1 VThermo",
            "driverUri": "homey:app:no.almli.thermostat",
            "driverId": "VThermo",
            "zone": "9eb2975d-49ea-4033-8db0-105a3e982117",
            "icon": null,
            "iconObj": {
                "id": "76e4e48dbf1227355616cc3ccbc13ed3",
                "url": "/icon/76e4e48dbf1227355616cc3ccbc13ed3/icon.svg"
            },
            "settings": {
                "hysteresis": 0.5
            },
            "settingsObj": true,
            "class": "thermostat",
            "virtualClass": null,
            "capabilities": [
                "vt_onoff",
                "target_temperature",
                "measure_temperature"
            ],
            "capabilitiesObj": {
                "vt_onoff": {
                    "value": false,
                    "lastUpdated": "2019-01-29T08:20:27.972Z",
                    "type": "boolean",
                    "getable": true,
                    "setable": false,
                    "title": "State",
                    "desc": "State of the device",
                    "units": null,
                    "iconObj": {
                        "id": "e26b791b9ffa7746315a0dbbe053b682",
                        "url": "/icon/e26b791b9ffa7746315a0dbbe053b682/icon.svg"
                    },
                    "id": "vt_onoff",
                    "options": {
                        "greyout": true,
                        "titleTrue": {
                            "en": "Active"
                        },
                        "titleFalse": {
                            "en": "Idle"
                        }
                    },
                    "titleTrue": "Active",
                    "titleFalse": "Idle"
                },
                "target_temperature": {
                    "value": 17.5,
                    "lastUpdated": "2019-01-29T08:00:24.986Z",
                    "type": "number",
                    "getable": true,
                    "setable": true,
                    "title": "Target temperature",
                    "desc": null,
                    "units": "°C",
                    "decimals": 1,
                    "min": 1,
                    "max": 40,
                    "step": 0.5,
                    "chartType": "stepLine",
                    "id": "target_temperature",
                    "options": {
                        "decimals": 1,
                        "min": 1,
                        "max": 40,
                        "step": 0.5
                    }
                },
                "measure_temperature": {
                    "value": 17.9,
                    "lastUpdated": "2019-01-29T08:26:28.869Z",
                    "type": "number",
                    "getable": true,
                    "setable": false,
                    "title": "Temperature",
                    "desc": null,
                    "units": "°C",
                    "decimals": 2,
                    "chartType": "spline",
                    "id": "measure_temperature",
                    "options": {}
                }
            },
            "flags": [],
            "ui": {
                "components": [
                    {
                        "id": "thermostat",
                        "capabilities": [
                            "measure_temperature",
                            "target_temperature"
                        ]
                    },
                    {
                        "id": "sensor",
                        "capabilities": [
                            "vt_onoff"
                        ]
                    }
                ],
                "componentsStartAt": 0
            },
            "ready": true,
            "available": true,
            "repair": false,
            "unpair": false,
            "speechExamples": [
                "Set the temperature to 21 degrees",
                "What is the average temperature at home?"
            ],
            "images": [],
            "insights": [
                {
                    "uri": "homey:device:1f4c5f56-150e-4ec8-9183-ef33022a5129",
                    "id": "target_temperature",
                    "type": "number",
                    "title": "Target temperature",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "°C"
                },
                {
                    "uri": "homey:device:1f4c5f56-150e-4ec8-9183-ef33022a5129",
                    "id": "measure_temperature",
                    "type": "number",
                    "title": "Temperature",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "°C"
                }
            ],
            "color": "#df20cb",
            "data": {
                "id": "1c475740-6fc2-d308-80fe-1fc31f2a87b2"
            }
        },

        "5b135d2e-125e-417a-bde2-435f413f77e2": {
            "__athom_api_type": "HomeyAPI.ManagerDevices.Device",
            "id": "5b135d2e-125e-417a-bde2-435f413f77e2",
            "name": "Room 2 Wallplug 1",
            "driverUri": "homey:app:com.fibaro",
            "driverId": "FGWPx-102-PLUS",
            "zone": "1815c884-af06-4d53-a2c1-6f4c77e9eb4e",
            "icon": "/icon.svg",
            "iconObj": {
                "id": "247c6a866eede5a63eb32c2c1de59f93",
                "url": "/icon/247c6a866eede5a63eb32c2c1de59f93/icon.svg"
            },
            "settings": {
                "always_on": false,
                "save_state": true,
                "watt_interval_report": 30,
                "watt_threshold_report": 15,
                "immediate_watt_percent_report": 80,
                "own_power": false,
                "kwh_threshold_report": 0.01,
                "watt_kwh_report_interval": 3600,
                "led_ring_color_on": "4",
                "led_ring_color_off": "0",
                "control_onoff_group2": "0",
                "zw_node_id": "62",
                "zw_manufacturer_id": "271",
                "zw_product_type_id": "1538",
                "zw_product_id": "4099",
                "zw_secure": "manager.vdevice.drivers.zwavebasic.devicesettings.yes_true",
                "zw_battery": "manager.vdevice.drivers.zwavebasic.devicesettings.yes_false",
                "zw_device_class_basic": "BASIC_TYPE_ROUTING_SLAVE",
                "zw_device_class_generic": "GENERIC_TYPE_SWITCH_BINARY",
                "zw_device_class_specific": "SPECIFIC_TYPE_POWER_SWITCH_BINARY",
                "zw_firmware_id": "1554",
                "zw_wakeup_interval": 0,
                "zw_group_1": "1",
                "zw_group_2": "",
                "zw_group_3": "",
                "zw_configuration_value": ""
            },
            "settingsObj": true,
            "class": "socket",
            "virtualClass": "heater",
            "capabilities": [
                "measure_power",
                "meter_power",
                "onoff"
            ],
            "capabilitiesObj": {
                "measure_power": {
                    "value": 0,
                    "lastUpdated": "2019-01-29T08:06:20.254Z",
                    "type": "number",
                    "getable": true,
                    "setable": false,
                    "title": "Power",
                    "desc": "Power in Watt (W)",
                    "units": "W",
                    "decimals": 2,
                    "chartType": "stepLine",
                    "id": "measure_power",
                    "options": {}
                },
                "meter_power": {
                    "value": 312.78,
                    "lastUpdated": "2019-01-29T07:55:23.517Z",
                    "type": "number",
                    "getable": true,
                    "setable": false,
                    "title": "Power Meter",
                    "desc": "Power usage in KiloWattHour (kWh)",
                    "units": "KWh",
                    "decimals": 2,
                    "chartType": "spline",
                    "id": "meter_power",
                    "options": {}
                },
                "onoff": {
                    "value": false,
                    "lastUpdated": "2019-01-29T07:06:19.550Z",
                    "type": "boolean",
                    "getable": true,
                    "setable": true,
                    "title": "Turned on",
                    "desc": null,
                    "units": null,
                    "id": "onoff",
                    "options": {}
                }
            },
            "flags": [
                "zwave"
            ],
            "ui": {
                "quickAction": "onoff",
                "components": [
                    {
                        "id": "toggle",
                        "capabilities": [
                            "onoff"
                        ]
                    },
                    {
                        "id": "sensor",
                        "capabilities": [
                            "measure_power",
                            "meter_power"
                        ]
                    }
                ],
                "componentsStartAt": 1
            },
            "ready": true,
            "available": true,
            "repair": false,
            "unpair": true,
            "speechExamples": [
                "Turn all lights on",
                "Turn off all devices",
                "Toggle all lights"
            ],
            "images": [],
            "insights": [
                {
                    "uri": "homey:device:5b135d2e-125e-417a-bde2-435f413f77e2",
                    "id": "measure_power",
                    "type": "number",
                    "title": "Power",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "W"
                },
                {
                    "uri": "homey:device:5b135d2e-125e-417a-bde2-435f413f77e2",
                    "id": "meter_power",
                    "type": "number",
                    "title": "Power Meter",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "KWh"
                },
                {
                    "uri": "homey:device:5b135d2e-125e-417a-bde2-435f413f77e2",
                    "id": "onoff",
                    "type": "boolean",
                    "title": "Turned on",
                    "titleTrue": "Turned on",
                    "titleFalse": "Turned off",
                    "units": null,
                    "decimals": null
                }
            ],
            "color": "#000000",
            "data": {
                "token": "35a422fe-bdf6-4bf4-889b-66033b8e1b71"
            }
        },
        "5b135d2e-125e-417a-bde2-435f413f77e3": {
            "__athom_api_type": "HomeyAPI.ManagerDevices.Device",
            "id": "5b135d2e-125e-417a-bde2-435f413f77e3",
            "name": "Room 2 Wallplug 2",
            "driverUri": "homey:app:com.fibaro",
            "driverId": "FGWPx-102-PLUS",
            "zone": "1815c884-af06-4d53-a2c1-6f4c77e9eb4e",
            "icon": "/icon.svg",
            "iconObj": {
                "id": "247c6a866eede5a63eb32c2c1de59f93",
                "url": "/icon/247c6a866eede5a63eb32c2c1de59f93/icon.svg"
            },
            "settings": {
                "always_on": false,
                "save_state": true,
                "watt_interval_report": 30,
                "watt_threshold_report": 15,
                "immediate_watt_percent_report": 80,
                "own_power": false,
                "kwh_threshold_report": 0.01,
                "watt_kwh_report_interval": 3600,
                "led_ring_color_on": "4",
                "led_ring_color_off": "0",
                "control_onoff_group2": "0",
                "zw_node_id": "62",
                "zw_manufacturer_id": "271",
                "zw_product_type_id": "1538",
                "zw_product_id": "4099",
                "zw_secure": "manager.vdevice.drivers.zwavebasic.devicesettings.yes_true",
                "zw_battery": "manager.vdevice.drivers.zwavebasic.devicesettings.yes_false",
                "zw_device_class_basic": "BASIC_TYPE_ROUTING_SLAVE",
                "zw_device_class_generic": "GENERIC_TYPE_SWITCH_BINARY",
                "zw_device_class_specific": "SPECIFIC_TYPE_POWER_SWITCH_BINARY",
                "zw_firmware_id": "1554",
                "zw_wakeup_interval": 0,
                "zw_group_1": "1",
                "zw_group_2": "",
                "zw_group_3": "",
                "zw_configuration_value": ""
            },
            "settingsObj": true,
            "class": "socket",
            "virtualClass": "fan",
            "capabilities": [
                "measure_power",
                "meter_power",
                "onoff"
            ],
            "capabilitiesObj": {
                "measure_power": {
                    "value": 0,
                    "lastUpdated": "2019-01-29T08:06:20.254Z",
                    "type": "number",
                    "getable": true,
                    "setable": false,
                    "title": "Power",
                    "desc": "Power in Watt (W)",
                    "units": "W",
                    "decimals": 2,
                    "chartType": "stepLine",
                    "id": "measure_power",
                    "options": {}
                },
                "meter_power": {
                    "value": 312.78,
                    "lastUpdated": "2019-01-29T07:55:23.517Z",
                    "type": "number",
                    "getable": true,
                    "setable": false,
                    "title": "Power Meter",
                    "desc": "Power usage in KiloWattHour (kWh)",
                    "units": "KWh",
                    "decimals": 2,
                    "chartType": "spline",
                    "id": "meter_power",
                    "options": {}
                },
                "onoff": {
                    "value": false,
                    "lastUpdated": "2019-01-29T07:06:19.550Z",
                    "type": "boolean",
                    "getable": true,
                    "setable": true,
                    "title": "Turned on",
                    "desc": null,
                    "units": null,
                    "id": "onoff",
                    "options": {}
                }
            },
            "flags": [
                "zwave"
            ],
            "ui": {
                "quickAction": "onoff",
                "components": [
                    {
                        "id": "toggle",
                        "capabilities": [
                            "onoff"
                        ]
                    },
                    {
                        "id": "sensor",
                        "capabilities": [
                            "measure_power",
                            "meter_power"
                        ]
                    }
                ],
                "componentsStartAt": 1
            },
            "ready": true,
            "available": true,
            "repair": false,
            "unpair": true,
            "speechExamples": [
                "Turn all lights on",
                "Turn off all devices",
                "Toggle all lights"
            ],
            "images": [],
            "insights": [
                {
                    "uri": "homey:device:5b135d2e-125e-417a-bde2-435f413f77e3",
                    "id": "measure_power",
                    "type": "number",
                    "title": "Power",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "W"
                },
                {
                    "uri": "homey:device:5b135d2e-125e-417a-bde2-435f413f77e3",
                    "id": "meter_power",
                    "type": "number",
                    "title": "Power Meter",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "KWh"
                },
                {
                    "uri": "homey:device:5b135d2e-125e-417a-bde2-435f413f77e3",
                    "id": "onoff",
                    "type": "boolean",
                    "title": "Turned on",
                    "titleTrue": "Turned on",
                    "titleFalse": "Turned off",
                    "units": null,
                    "decimals": null
                }
            ],
            "color": "#000000",
            "data": {
                "token": "35a422fe-bdf6-4bf4-889b-66033b8e1b72"
            }
        },
        "289a6897-79c9-40d9-abbb-0fc69a3af7d6": {
            "__athom_api_type": "HomeyAPI.ManagerDevices.Device",
            "id": "289a6897-79c9-40d9-abbb-0fc69a3af7d6",
            "name": "Room 2 Smoke Detector",
            "driverUri": "homey:app:com.fibaro",
            "driverId": "FGSD-002",
            "zone": "1815c884-af06-4d53-a2c1-6f4c77e9eb4e",
            "icon": "/icon.svg",
            "iconObj": {
                "id": "1b671ca6b3f1b7e23da3308a4ee578bf",
                "url": "/icon/1b671ca6b3f1b7e23da3308a4ee578bf/icon.svg"
            },
            "settings": {
                "smoke_sensitivity": "2",
                "temperature_report_interval": 1,
                "temperature_report_hysteresis": 10,
                "temperature_alarm_treshold": 55,
                "visual_notification": "0",
                "acoustic_notification": "0",
                "zw_node_id": "48",
                "zw_manufacturer_id": "271",
                "zw_product_type_id": "3074",
                "zw_product_id": "4099",
                "zw_secure": "manager.vdevice.drivers.zwavebasic.devicesettings.yes_true",
                "zw_battery": "manager.vdevice.drivers.zwavebasic.devicesettings.yes_true",
                "zw_device_class_basic": "BASIC_TYPE_ROUTING_SLAVE",
                "zw_device_class_generic": "GENERIC_TYPE_SENSOR_NOTIFICATION",
                "zw_device_class_specific": "SPECIFIC_TYPE_NOTIFICATION_SENSOR",
                "zw_firmware_id": "3090",
                "zw_wakeup_interval": 14400,
                "zw_group_1": "1",
                "zw_group_2": "",
                "zw_group_3": "",
                "zw_group_4": "",
                "zw_group_5": "",
                "zw_wakeup_enabled": true,
                "zw_configuration_value": ""
            },
            "settingsObj": true,
            "class": "sensor",
            "virtualClass": null,
            "capabilities": [
                "measure_battery",
                "alarm_heat",
                "alarm_smoke",
                "measure_temperature"
            ],
            "capabilitiesObj": {
                "measure_battery": {
                    "value": 100,
                    "lastUpdated": "2018-12-20T12:26:36.631Z",
                    "type": "number",
                    "getable": true,
                    "setable": false,
                    "title": "Battery",
                    "desc": "Battery charge in percentage (%)",
                    "units": "%",
                    "decimals": 2,
                    "min": 0,
                    "max": 100,
                    "chartType": "spline",
                    "id": "measure_battery",
                    "options": {}
                },
                "alarm_heat": {
                    "value": null,
                    "lastUpdated": "2019-01-28T12:57:00.884Z",
                    "type": "boolean",
                    "getable": true,
                    "setable": false,
                    "title": "Heat alarm",
                    "desc": "True when extreme heat has been detected",
                    "units": null,
                    "id": "alarm_heat",
                    "options": {}
                },
                "alarm_smoke": {
                    "value": null,
                    "lastUpdated": "2019-01-28T12:57:00.892Z",
                    "type": "boolean",
                    "getable": true,
                    "setable": false,
                    "title": "Smoke alarm",
                    "desc": "True when smoke has been detected",
                    "units": null,
                    "id": "alarm_smoke",
                    "options": {}
                },
                "measure_temperature": {
                    "value": 17.1,
                    "lastUpdated": "2019-01-29T08:04:04.828Z",
                    "type": "number",
                    "getable": true,
                    "setable": false,
                    "title": "Temperature",
                    "desc": null,
                    "units": "°C",
                    "decimals": 2,
                    "chartType": "spline",
                    "id": "measure_temperature",
                    "options": {}
                }
            },
            "flags": [
                "zwave"
            ],
            "ui": {
                "components": [
                    {
                        "id": "sensor",
                        "capabilities": [
                            "alarm_heat",
                            "alarm_smoke",
                            "measure_temperature"
                        ]
                    },
                    {
                        "id": "battery",
                        "capabilities": [
                            "measure_battery"
                        ]
                    }
                ],
                "componentsStartAt": 0
            },
            "ready": true,
            "available": true,
            "repair": false,
            "unpair": true,
            "speechExamples": [
                "What is the average temperature at home?"
            ],
            "images": [],
            "insights": [
                {
                    "uri": "homey:device:289a6897-79c9-40d9-abbb-0fc69a3af7d6",
                    "id": "measure_battery",
                    "type": "number",
                    "title": "Battery",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "%"
                },
                {
                    "uri": "homey:device:289a6897-79c9-40d9-abbb-0fc69a3af7d6",
                    "id": "alarm_heat",
                    "type": "boolean",
                    "title": "Heat alarm",
                    "titleTrue": "Heat alarm turned on",
                    "titleFalse": "Heat alarm turned off",
                    "units": null,
                    "decimals": null
                },
                {
                    "uri": "homey:device:289a6897-79c9-40d9-abbb-0fc69a3af7d6",
                    "id": "alarm_smoke",
                    "type": "boolean",
                    "title": "Smoke alarm",
                    "titleTrue": "Smoke alarm turned on",
                    "titleFalse": "Smoke alarm turned off",
                    "units": null,
                    "decimals": null
                },
                {
                    "uri": "homey:device:289a6897-79c9-40d9-abbb-0fc69a3af7d6",
                    "id": "measure_temperature",
                    "type": "number",
                    "title": "Temperature",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "°C"
                }
            ],
            "color": "#000000",
            "data": {
                "token": "76edf915-b014-405e-aab3-0bd2ae4974da"
            }
        },
        "8cb3c93e-8132-423c-80ac-62b7243c6091": {
            "__athom_api_type": "HomeyAPI.ManagerDevices.Device",
            "id": "8cb3c93e-8132-423c-80ac-62b7243c6091",
            "name": "Room 2 Temperature",
            "driverUri": "homey:app:com.weather-sensors",
            "driverId": "temphum",
            "zone": "1815c884-af06-4d53-a2c1-6f4c77e9eb4e",
            "icon": null,
            "iconObj": {
                "id": "a2931cd8e2df971fe57a530d4b1b9574",
                "url": "/icon/a2931cd8e2df971fe57a530d4b1b9574/icon.svg"
            },
            "settings": {
                "protocol": "Alecto v3",
                "type": "WH2",
                "channel": "2",
                "id": "151",
                "update": "Tue Jan 29 2019 09:28:45 GMT+0100 (CET)",
                "offset_temperature": 0,
                "offset_humidity": 0
            },
            "settingsObj": true,
            "class": "sensor",
            "virtualClass": null,
            "capabilities": [
                "measure_temperature",
                "measure_humidity"
            ],
            "capabilitiesObj": {
                "measure_temperature": {
                    "value": 17.4,
                    "lastUpdated": "2019-01-29T08:26:21.327Z",
                    "type": "number",
                    "getable": true,
                    "setable": false,
                    "title": "Temperature",
                    "desc": null,
                    "units": "°C",
                    "decimals": 2,
                    "chartType": "spline",
                    "id": "measure_temperature",
                    "options": {}
                },
                "measure_humidity": {
                    "value": 30,
                    "lastUpdated": "2019-01-29T07:57:33.358Z",
                    "type": "number",
                    "getable": true,
                    "setable": false,
                    "title": "Humidity",
                    "desc": "Humidity in percent (%)",
                    "units": "%",
                    "decimals": 2,
                    "chartType": "spline",
                    "id": "measure_humidity",
                    "options": {}
                }
            },
            "flags": [],
            "ui": {
                "components": [
                    {
                        "id": "sensor",
                        "capabilities": [
                            "measure_temperature",
                            "measure_humidity"
                        ]
                    }
                ],
                "componentsStartAt": 0
            },
            "ready": true,
            "available": true,
            "repair": false,
            "unpair": false,
            "unavailableMessage": null,
            "speechExamples": [
                "What is the average temperature at home?",
                "What is the average humidity at home?"
            ],
            "images": [],
            "insights": [
                {
                    "uri": "homey:device:8cb3c93e-8132-423c-80ac-62b7243c6091",
                    "id": "measure_temperature",
                    "type": "number",
                    "title": "Temperature",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "°C"
                },
                {
                    "uri": "homey:device:8cb3c93e-8132-423c-80ac-62b7243c6091",
                    "id": "measure_humidity",
                    "type": "number",
                    "title": "Humidity",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "%"
                }
            ],
            "color": "#df2029",
            "data": {
                "id": "alectov3:151:2",
                "type": "TH"
            }
        },
        "8cb3c93e-8132-423c-80ac-62b7243c6092": {
            "__athom_api_type": "HomeyAPI.ManagerDevices.Device",
            "id": "8cb3c93e-8132-423c-80ac-62b7243c6092",
            "name": "Room 2 Humidity",
            "driverUri": "homey:app:com.weather-sensors",
            "driverId": "temphum",
            "zone": "1815c884-af06-4d53-a2c1-6f4c77e9eb4e",
            "icon": null,
            "iconObj": {
                "id": "a2931cd8e2df971fe57a530d4b1b9574",
                "url": "/icon/a2931cd8e2df971fe57a530d4b1b9574/icon.svg"
            },
            "settings": {
                "protocol": "Alecto v3",
                "type": "WH2",
                "channel": "2",
                "id": "151",
                "update": "Tue Jan 29 2019 09:28:45 GMT+0100 (CET)",
                "offset_temperature": 0,
                "offset_humidity": 0
            },
            "settingsObj": true,
            "class": "sensor",
            "virtualClass": null,
            "capabilities": [
                "measure_humidity"
            ],
            "capabilitiesObj": {
                "measure_humidity": {
                    "value": 40,
                    "lastUpdated": "2019-01-29T07:57:33.358Z",
                    "type": "number",
                    "getable": true,
                    "setable": false,
                    "title": "Humidity",
                    "desc": "Humidity in percent (%)",
                    "units": "%",
                    "decimals": 2,
                    "chartType": "spline",
                    "id": "measure_humidity",
                    "options": {}
                }
            },
            "flags": [],
            "ui": {
                "components": [
                    {
                        "id": "sensor",
                        "capabilities": [
                            "measure_humidity"
                        ]
                    }
                ],
                "componentsStartAt": 0
            },
            "ready": true,
            "available": true,
            "repair": false,
            "unpair": false,
            "unavailableMessage": null,
            "speechExamples": [
                "What is the average temperature at home?",
                "What is the average humidity at home?"
            ],
            "images": [],
            "insights": [
                {
                    "uri": "homey:device:8cb3c93e-8132-423c-80ac-62b7243c6092",
                    "id": "measure_humidity",
                    "type": "number",
                    "title": "Humidity",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "%"
                }
            ],
            "color": "#df2029",
            "data": {
                "id": "alectov3:151:2",
                "type": "TH"
            }
        },
        "1632a4d8-4b0c-4090-b363-7599d472a2bc": {
            "__athom_api_type": "HomeyAPI.ManagerDevices.Device",
            "id": "1632a4d8-4b0c-4090-b363-7599d472a2bc",
            "name": "Room 2 VThermo",
            "driverUri": "homey:app:no.almli.thermostat",
            "driverId": "VThermo",
            "zone": "1815c884-af06-4d53-a2c1-6f4c77e9eb4e",
            "icon": null,
            "iconObj": {
                "id": "76e4e48dbf1227355616cc3ccbc13ed3",
                "url": "/icon/76e4e48dbf1227355616cc3ccbc13ed3/icon.svg"
            },
            "settings": {
                "hysteresis": 0.5
            },
            "settingsObj": true,
            "class": "thermostat",
            "virtualClass": null,
            "capabilities": [
                "vt_onoff",
                "target_temperature",
                "measure_temperature"
            ],
            "capabilitiesObj": {
                "vt_onoff": {
                    "value": false,
                    "lastUpdated": "2019-01-29T08:29:29.511Z",
                    "type": "boolean",
                    "getable": true,
                    "setable": false,
                    "title": "State",
                    "desc": "State of the device",
                    "units": null,
                    "iconObj": {
                        "id": "e26b791b9ffa7746315a0dbbe053b682",
                        "url": "/icon/e26b791b9ffa7746315a0dbbe053b682/icon.svg"
                    },
                    "id": "vt_onoff",
                    "options": {
                        "greyout": true,
                        "titleTrue": {
                            "en": "Active"
                        },
                        "titleFalse": {
                            "en": "Idle"
                        }
                    },
                    "titleTrue": "Active",
                    "titleFalse": "Idle"
                },
                "target_temperature": {
                    "value": 16.5,
                    "lastUpdated": "2019-01-29T08:00:25.048Z",
                    "type": "number",
                    "getable": true,
                    "setable": true,
                    "title": "Target temperature",
                    "desc": null,
                    "units": "°C",
                    "decimals": 1,
                    "min": 1,
                    "max": 40,
                    "step": 0.5,
                    "chartType": "stepLine",
                    "id": "target_temperature",
                    "options": {
                        "decimals": 1,
                        "min": 1,
                        "max": 40,
                        "step": 0.5
                    }
                },
                "measure_temperature": {
                    "value": 17.1,
                    "lastUpdated": "2019-01-29T08:04:25.798Z",
                    "type": "number",
                    "getable": true,
                    "setable": false,
                    "title": "Temperature",
                    "desc": null,
                    "units": "°C",
                    "decimals": 2,
                    "chartType": "spline",
                    "id": "measure_temperature",
                    "options": {}
                }
            },
            "flags": [],
            "ui": {
                "components": [
                    {
                        "id": "thermostat",
                        "capabilities": [
                            "measure_temperature",
                            "target_temperature"
                        ]
                    },
                    {
                        "id": "sensor",
                        "capabilities": [
                            "vt_onoff"
                        ]
                    }
                ],
                "componentsStartAt": 0
            },
            "ready": true,
            "available": true,
            "repair": false,
            "unpair": false,
            "speechExamples": [
                "Set the temperature to 21 degrees",
                "What is the average temperature at home?"
            ],
            "images": [],
            "insights": [
                {
                    "uri": "homey:device:1632a4d8-4b0c-4090-b363-7599d472a2bc",
                    "id": "target_temperature",
                    "type": "number",
                    "title": "Target temperature",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "°C"
                },
                {
                    "uri": "homey:device:1632a4d8-4b0c-4090-b363-7599d472a2bc",
                    "id": "measure_temperature",
                    "type": "number",
                    "title": "Temperature",
                    "titleTrue": null,
                    "titleFalse": null,
                    "units": "°C"
                }
            ],
            "color": "#df20cb",
            "data": {
                "id": "524f6e96-2874-b248-b15a-f172efcd3b41"
            }
        }
    };
    for (let device in devices) {
        let d = devices[device];
        d.setCapabilityValue = function (cap, value) {
            d.capabilitiesObj[cap].value = value;
            return Promise.resolve();
        };
    }
    return devices;
};

module.exports = {
    getDevice: getDevice,
    getDevices: getDevices
};
