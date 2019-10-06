# Virtual thermostat and humidity app

## Device: VThermo

Add a virtual thermostat to a zone with a temperature sensor and it will turn on / off heaters in the same zone.

Use a door/window sensor in the same zone to automatically turn off the heater on a contact alarm. This can be enabled with the 'Turn off if contact alarm' - checkbox in 'Advanced settings'.

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

Fans will turn on if the humidity is larger than the target humidity, and off if less than the target humidity.  For humidifiers the logic can be inverted, by selecting the 'Invert for humidifier' - checkbox in 'Advanced settings'.

#### Triggers

- The humidity has changed.
- The target humidity has changed.
- The humidity device turned off.
- The humidity device turned on.

#### Conditions

- The humidity device is on / off.
- Humidity has increased more than [x] % points last [y] minutes.
- Humidity has decreased more than [x] % points last [y] minutes.

#### Actions

- Set the target humidity.

## Acknowledgements:

Development has been supported by:   
* Robert Hertzer for testing

## Feedback:

Please report issues at the [issues section on Github](https://github.com/balmli/no.almli.thermostat/issues).

## Release Notes:

#### 1.1.14

- VThermo: Added an option to invert switching.

#### 1.1.13

- Updated Athom api.
- Fix timeouts, issue #23.

#### 1.1.11

- Updated Athom api.
- VThermo: added option to turn off if contact alarm.

#### 1.1.10

- VHumidity: Added condition 'Humidity has increased more than [x] % points last [y] minutes'
- VHumidity: Added condition 'Humidity has decreased more than [x] % points last [y] minutes'
- Updated athom-api
- VThermo: only trigger on/off if on/off has changed. 
- VHumidity: only trigger on/off if on/off has changed. 

#### 1.1.7

- Bugfix, ref. issue #18

#### 1.1.5

- Updated athom-api
- Possible to turn on / off directly from the app (quick-toggle, device must be reinstalled)

#### 1.1.4

- VHumidity: Added an option to support humidifiers.

#### 1.1.3

- Added tests
- Minor bug fixes

#### 1.1.2

- Support switching virtual devices (heaters and fans).
- Catch errors when switching heaters and fans on or off.

#### 1.1.1

- Fix if zero (0) degrees.

#### 1.1.0

- Added VHumidity device

#### 1.0.1

- Changed min. temperature from 5 to 1 deg.

#### 1.0.0

- Stable for app store
