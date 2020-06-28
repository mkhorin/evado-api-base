/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('evado/component/helper/SelectHelper');

module.exports = class MetaSelectHelper extends Base {

    static getLabelMap (items) {
        const result = {};
        for (const item of items) {
            result[item.name] = this.getLabelText(item);
        }
        return result;
    }

    static getLabelItems (items) {
        return this.getItems(items, {
            getItemText: this.getLabelText,
            valueKey: 'name'
        });
    }

    static getLabelText (item) {
        return `${item.label} (${item.name})`;
    }
};