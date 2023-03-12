import {
    DRIVER_VTHERMO,
    TemperatureSettings,
    TemperatureSettingsZone,
} from "./types";

export class TemperatureSettingsMapper {

    static map(driverId?: string, settings?: any): TemperatureSettings | undefined {
        if (driverId === DRIVER_VTHERMO && settings) {
            const t = new TemperatureSettings();
            t.calcMethod = settings.calc_method;
            t.measurementMaxAge = !!settings.ignore_old_measurements ? settings.ignore_old_measurements * 1000 : undefined;
            t.validate = settings.validate_temperature;
            t.validate_min = settings.validate_min_temp;
            t.validate_max = settings.validate_max_temp;

            t.zone = new TemperatureSettingsZone();
            t.zone.sensor = settings.zone_sensors;
            t.zone.thermostat = settings.thermostat;
            t.zone.vthermo = false;
            t.zone.other = settings.zone_other;

            t.parent = new TemperatureSettingsZone();
            t.parent.sensor = settings.parent_sensors;
            t.parent.thermostat = settings.parent_thermostat;
            t.parent.vthermo = settings.parent_vthermo;
            t.parent.other = settings.parent_other;

            t.children = new TemperatureSettingsZone();
            t.children.sensor = settings.sub_sensors;
            t.children.thermostat = settings.sub_thermostat;
            t.children.vthermo = settings.sub_vthermo;
            t.children.other = settings.sub_other;

            return t;
        }
    }

}