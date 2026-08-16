import {DeviceSettings, DeviceSettingssZone, DRIVER_VHUMIDITY, DRIVER_VTHERMO} from './types';

export class DeviceSettingsMapper {
    static map(driverId?: string, settings?: any): DeviceSettings | undefined {
        if (settings) {
            const t = new DeviceSettings();

            if (driverId === DRIVER_VTHERMO) {
                t.zone = new DeviceSettingssZone();
                t.zone.clazz = settings.devices_zone_heaters;
                t.zone.coolers = settings.devices_zone_coolers;
                t.zone.sockets_heaters = settings.devices_zone_sockets_heaters;
                t.zone.sockets_coolers = settings.devices_zone_sockets_coolers;
                t.zone.thermostats = settings.devices_zone_thermostats;

                t.sub_zones = new DeviceSettingssZone();
                t.sub_zones.clazz = settings.devices_sub_zones_heaters;
                t.sub_zones.coolers = settings.devices_sub_zones_coolers;
                t.sub_zones.sockets_heaters = settings.devices_sub_zones_sockets_heaters;
                t.sub_zones.sockets_coolers = settings.devices_sub_zones_sockets_coolers;
                t.sub_zones.thermostats = settings.devices_sub_zones_thermostats;
            } else if (driverId === DRIVER_VHUMIDITY) {
                t.zone = new DeviceSettingssZone();
                t.zone.clazz = true;
            }

            t.contactAlarm = settings.contact_alarm;
            t.contactAlarmDelay = settings.contact_alarm_delay !== undefined ? settings.contact_alarm_delay * 1000 : 0;
            t.motionAlarm = settings.motion_alarm;
            t.hysteresis = settings.hysteresis;
            t.invert = settings.invert;
            t.onoffEnabled = settings.onoff_enabled;
            t.deviceDelay = settings.device_delay;
            t.minOffDuration = settings.min_off_duration !== undefined ? settings.min_off_duration * 1000 : 0;
            t.minOnDuration = settings.min_on_duration !== undefined ? settings.min_on_duration * 1000 : 0;
            t.presetEcoOffset = settings.preset_eco_offset;
            t.presetAwayTemp = settings.preset_away_temp;
            t.presetBoostOffset = settings.preset_boost_offset;
            t.failsafeEnabled = settings.failsafe_enabled;
            t.frostAlarmTemp = settings.frost_alarm_temp;
            t.overheatAlarmTemp = settings.overheat_alarm_temp;
            t.condensationProtection = settings.condensation_protection;

            return t;
        }
    }
}
