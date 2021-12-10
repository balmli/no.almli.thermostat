import {BaseDevice} from '../../lib/BaseDevice';
import {ValueStore} from '../../lib/ValueStore';

module.exports = class VHumidityDevice extends BaseDevice {

    private _humidityStore!: ValueStore;

    async onInit(): Promise<void> {
        super.onInit();
        await this.migrate();
        await this.initialize();
    }

    async migrate(): Promise<void> {
        try {
        } catch (err) {
            this.logger.error('migration failed', err);
        }
    }

    async initialize(): Promise<void> {
        this._humidityStore = new ValueStore();

        this.registerCapabilityListener('onoff', async (value: any, opts: any) => {
            if (!this.getSetting('onoff_enabled')) {
                if (this.getCapabilityValue('onoff') !== true) {
                    await this.setCapabilityValue('onoff', true)
                        .catch(err => this.logger.error(err));
                }
                throw new Error(this.homey.__('error.switching_disabled'));
            }
        });

        this.registerCapabilityListener('vh_target_humidity', async (value, opts) => {
            await this.homey.flow.getDeviceTriggerCard('vh_target_humidity_changed')
                .trigger(this, {
                    humidity: value
                })
                .catch(err => this.logger.error(err));
            await this.setCapabilityValue('vh_target_humidity_view', value)
                .catch(err => this.logger.error(err));
            // @ts-ignore
            this.homey.app.updateByDataId(this.getData().id, 'vh_target_humidity', value);
        });
    }

    onAdded(): void {
        this.setCapabilityValue('onoff', true)
            .catch(err => this.logger.error(err));
        this.setCapabilityValue('vh_target_humidity', 50)
            .catch(err => this.logger.error(err));
    }

    getValueStore(): ValueStore {
        return this._humidityStore;
    }

    async onSettings({oldSettings, newSettings, changedKeys}: {
        oldSettings: any;
        newSettings: any;
        changedKeys: string[];
    }): Promise<string | void> {
        if (changedKeys.includes('onoff_enabled') &&
            !newSettings.onoff_enabled &&
            this.getCapabilityValue('onoff') !== true) {
            this.setCapabilityValue('onoff', true)
                .catch(err => this.log(err));
        }
        this.homey.setTimeout(() => {
            // @ts-ignore
            this.homey.app.startCalculation();
        }, 1000);
    }

};
