# Thermostat

Add this virtual thermostat to a zone with a temperature sensor and it will turn on / off heaters in the same zone.

The thermostat has modes (Heating, Energy Saving, Cooling and Off), and separate setpoint temperatures for the different modes.

## Flow cards

### Device: VThermo
#### Triggers

- The temperature has changed.
- The target temperature has changed.
- The thermostat mode has changed.
- The thermostat mode has changed to.
- The thermostat turned off.
- The thermostat turned on.

#### Conditions

- The thermostat is on / off.
- The thermostat mode is / is not. 

#### Actions

- Set the temperature.  This will update the setpoint temperature for the current thermostat mode.
- Set the thermostat mode. This will update the thermostat mode and activate instantly.  Will also update the target temperature.
- Set a setpoint of a thermostat mode.  This will update the setpoint temperature for a thermostat mode.  Will not switch mode, but will update the target temperature if updated for the current mode.

### Release Notes

#### 0.0.1
- Initial version
