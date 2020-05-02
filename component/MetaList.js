/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('evado/component/meta/MetaGrid');

module.exports = class MetaList extends Base {

    async setModels () {
        this._models = await this.query.all();
    }

    getRenderRelationHandler () {
        return null;
    }

    getRenderRelatedHandler () {
        return this.renderRelatedDefault;
    }
};