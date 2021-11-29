import { BaseDriver } from '../../lib/BaseDriver';

module.exports = class VThermoDriver extends BaseDriver {

  getDriverName(): string {
    return 'VThermo';
  }

};
