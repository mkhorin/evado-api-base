/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('evado/component/base/BaseModule');

module.exports = class BaseApiModule extends Base {

    static getConstants () {
        return {
            NAME: 'base'
        };
    }
};
module.exports.init(module);