# Virtual thermostat and humidity app

## Device: VThermo

Add a virtual thermostat to a zone with a temperature sensor and it will turn on / off heaters in the same zone.

#### Triggers

- The temperature has changed.
- The target temperature has changed.
- The thermostat turned off.
- The thermostat turned on.

#### Conditions

- The thermostat is on / off.

#### Actions

- Set the target temperature.

## Device: VHumidity

Add a virtual humidity controller to a zone with a humidity sensor and it will turn on / off fans in the same zone.

#### Triggers

- The humidity has changed.
- The target humidity has changed.
- The humidity device turned off.
- The humidity device turned on.

#### Conditions

- The humidity device is on / off.

#### Actions

- Set the target humidity.

## Acknowledgements:

Development has been supported by:   
* Robert Hertzer for testing

## Feedback:

Please report issues at the [issues section on Github](https://github.com/balmli/no.almli.thermostat/issues).

## Release Notes:

#### 1.1.2

- Support switching virtual devices (heater and fans).
- Catch errors when switching heaters and fans on or off.

#### 1.1.1

- Fix if zero (0) degrees.

#### 1.1.0

- Added VHumidity device

#### 1.0.1

- Changed min. temperature from 5 to 1 deg.

#### 1.0.0

- Stable for app store
