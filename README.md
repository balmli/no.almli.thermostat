# Thermostat

A virtual thermostat that gets the temperature from a temperature sensor to turn on / off heaters in the same zone.

## Flow cards

### Device: VThermo
#### Triggers

- The thermostat mode has changed
- The thermostat mode has changed to
- The temperature has changed
- The target temperature has changed

#### Conditions

- The thermostat is on / off
- The thermostat mode is / is not

#### Actions

- Set the temperature for the current thermostat mode
- Set the thermostat mode
- Set the setpoint of a thermostat mode 

### Release Notes

#### 0.0.1
- Initial version
