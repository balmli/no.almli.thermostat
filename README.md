# Thermostat

A virtual thermostat that gets the temperature from a temperature sensor to turn on / off heaters in the same zone.

## Flow cards

### Device: VThermo
#### Triggers

- The temperature has changed
- The target temperature has changed
- The thermostat mode has changed
- The thermostat mode has changed to
- The thermostat turned off
- The thermostat turned on

#### Conditions

- The thermostat is on / off
- The thermostat mode is / is not

#### Actions

- Set the thermostat mode
- Set the temperature for the current thermostat mode

### Release Notes

#### 0.0.1
- Initial version
