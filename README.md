# Virtual thermostat and humidity app

## Device: VThermo

Add a virtual thermostat to a zone with a temperature sensor and it will turn on / off heaters in the same zone.  The virtual thermostat will start operating when the target temperature has been set.

Use a door/window sensor in the same zone to automatically turn off the heater on a contact alarm. This can be enabled with the 'Turn off if contact alarm' - checkbox in 'Advanced settings'.

#### Master thermostat

The virtual thermostat can be used as a 'master thermostat'.  As a master thermostat it will update the target temperature of other thermostats.  Not only other VThermo - termostats, but standard phyical thermostats as well.

In Advanced settings, you can choose zones to control:

- same zone
- sub zones, just one level down
- all sub zones, all levels down

Select 'Update other thermostats' to update other thermostats and 'Update other VThermos' to update other virtual thermostats.

#### Temperature sensors

You can select the temperature sensors the virtual thermostat will take into consideration when calculation its temperature.  

In Advanced settings, you can choose the types of temperature sensors: standard, other thermostats, other VThermo - thermostats and other devices with a temperature capability.

You can use temperature sensors from the same zone, from the parent zone, and from the sub zones.

#### Triggers

- The temperature has changed.
- The target temperature has changed.
- The thermostat turned off.
- The thermostat turned on.

#### Conditions

- The thermostat is on / off.

#### Actions

- Set the target temperature.
- Turn on / off.

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
- Turn on / off.

## Details about Advanced settings

#### Temperature
- Temperature calculation method: select between 'Average', 'Minimum' or 'Maximum'.

#### Temperature sensors in the same zone
Select which temperature sensors to be used from the same zone as the virtual thermostat.

- standard temperature sensors
- other thermostats
- other devices with a temperature capability

#### Temperature sensors from the parent zone
Select temperature sensors from the parent zone of the virtual thermostat:

- standard temperature sensors
- other thermostats
- other VThermo - thermostats
- other devices with a temperature capability

#### Temperature sensors from sub zones (one level)
Select temperature sensors from the sub zones of the virtual thermostat,  just one level down.

- standard temperature sensors
- other thermostats
- other VThermo - thermostats
- other devices with a temperature capability

#### Control devices in sub zones (one level)
- Heaters: check this to control heaters in sub zones (one level down)

#### Target temperature

- Target temperature offset (°C): offset when the target temperature is updated from a master VThermo - thermostat.
- Minimum target temperature (°C): minimum value for the target temperature, when updated from a master VThermo - thermostat.
- Maximum target temperature (°C): maximum value for the target temperature, when updated from a master VThermo - thermostat.

#### Target temperature in the same zone
- From other thermostat: check this to update target temperature on this VThermo from another thermostat in the same zone.
- Update other thermostats: check this to update the target temperature of other thermostats in the same zone.

#### Target temperature to sub zones (one level)
- Update other VThermos: check this to update the target temperature of other VThermo - thermostats in sub zones (one level down).
- Update other thermostats: check this to update the target temperature of other thermostats in sub zones (one level down).

#### Target temperature to sub zones (all levels)
- Update other VThermos: check this to update the target temperature of other VThermo - thermostats in all sub zones (all levels down).
- Update other thermostats: check this to update the target temperature of other thermostats in all sub zones (all levels down).

#### Contact alarm
- Turn off if contact alarm: check this to turn off heaters if there is a contact alarm in the same zone as the virtual thermostat.

#### General settings
- Hysteresis: to avoid that the thermostat will turn on and off too often, the hysteresis value must be greater than zero. Example: with a value of 0.5, and a target temperature of 20.0 °C, the thermostat will switch on if below 20.0 - 0.5, and off if above 20.0 + 0.5.  
- Invert switch: check this and the thermostat will switch on if above the target, and switch off if below the target.
- On / off enabled: uncheck this to disable the thermostat On / Off - switch.

#### Timing
- Delay in milliseconds between switching devices: if this value is set to a number larger than zero, it will add a delay between switching each devices on / off.  This might help


## Feedback:

Please report issues at the [issues section on Github](https://github.com/balmli/no.almli.thermostat/issues).

## Release Notes:

#### 1.3.1

- Added support to control heaters in sub zones (one level down).

#### 1.2.3

- Added 'Newest' as calculation method for temperature and humidity.
- Handle adding several devices at the same time. 
- Updated Athom api.

#### 1.2.2

- Fixed refresh bug in VHumidity.

#### 1.2.1

- Allow update both from and to another thermostat.

#### 1.2.0

- Added support for master thermostats, e.g. update target temperatures on other thermostats.
- Added support for temperatures from other zones. 
- Added calculation methods for temperature and humidity (average, minimum, maximum).
- Reduced memory consumption.

#### 1.1.21

- Added setting to disable switching devices off.
- Added on / off capability for VHumidity.
- Added view for the target humidity for VHumidity.

#### 1.1.20

- Updated Athom api.

#### 1.1.19

- Avoid triggers firing two times.

#### 1.1.18

- Update temperature and humidity even if the target has not been set.

#### 1.1.17

- You can set a delay after each device has been switched on / off.
- Thermostats can be used as temperature sensors.

#### 1.1.16

- Fixes to avoid timeouts.

#### 1.1.15

- Timeout fixes.

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
