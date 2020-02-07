/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('evado/component/helper/SelectHelper');

module.exports = class MetaSelectHelper extends Base {

    static getLabelItems (items) {
        return this.getItems(items, {
            getItemText: this.getLabelText,
            valueKey: 'name'
        });
    }

    static getLabelText (doc) {
        return doc.data.label ? `${doc.data.label} (${doc.name})` : doc.name;
    }
};