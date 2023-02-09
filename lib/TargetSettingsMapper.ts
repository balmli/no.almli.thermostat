import {
    DRIVER_URI,
    DRIVER_VTHERMO,
    TargetSettings,
    TargetSettingsZone,
} from "./types";

export class TargetSettingsMapper {

    static map(driverUri?: string, driverId?: string, settings?: any): TargetSettings | undefined {
        if (driverUri === DRIVER_URI
            && (driverId === DRIVER_VTHERMO || driverId === DRIVER_URI + ':' + DRIVER_VTHERMO)
            && settings) {
            const t = new TargetSettings();
            t.offset = settings.target_diff_temp;
            t.min = settings.target_min_temp;
            t.max = settings.target_max_temp;
            t.target_update_enabled = settings.target_update_enabled;

            t.zone = new TargetSettingsZone();
            t.zone.from_other = settings.target_zone_from_other;
            t.zone.to_other = settings.target_zone_to_other
                && !settings.target_zone_from_other
                && !settings.devices_zone_thermostats;

            t.sub_zones = new TargetSettingsZone();
            t.sub_zones.to_vthermo = settings.target_sub_zones_to_vthermo;
            t.sub_zones.to_other = settings.target_sub_zones_to_other;

            t.all_sub_zones = new TargetSettingsZone();
            t.all_sub_zones.to_vthermo = settings.target_all_sub_zones_to_vthermo;
            t.all_sub_zones.to_other = settings.target_all_sub_zones_to_other;

            return t;
        }
    }

}