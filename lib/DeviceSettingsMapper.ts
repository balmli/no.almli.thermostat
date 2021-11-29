import {
    DeviceSettings,
    DeviceSettingssZone,
    DRIVER_URI,
    DRIVER_VTHERMO,
} from "./types";

export class DeviceSettingsMapper {

    static map(driverUri?: string, driverId?: string, settings?: any): DeviceSettings | undefined {
        if (driverUri === DRIVER_URI
            && driverId === DRIVER_VTHERMO
            && settings) {
            const t = new DeviceSettings();

            t.zone = new DeviceSettingssZone();
            t.zone.clazz = true;

            t.sub_zones = new DeviceSettingssZone();
            t.sub_zones.clazz = settings.devices_sub_zones_heaters;

            t.contactAlarm = settings.contact_alarm;
            t.motionAlarm = settings.motion_alarm;
            t.hysteresis = settings.hysteresis;
            t.invert = settings.invert;
            t.onoffEnabled = settings.onoff_enabled;
            t.deviceDelay = settings.device_delay;

            return t;
        }
    }

}