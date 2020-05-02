/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('evado/model/RawFile');

module.exports = class RawFile extends Base {

    createValidators () {
        const validators = super.createValidators();
        if (this.fileBehavior.rule) {
            const validator = this.createValidator(this.fileBehavior.rule);
            if (validator) {
                validators.push(validator);
            }
        }
        return validators;
    }
};
module.exports.init(module);