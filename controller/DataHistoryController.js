/**
 * @copyright Copyright (c) 2022 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('../component/BaseController');

module.exports = class DataHistoryController extends Base {

    static getConstants () {
        return {
            LIST_COLUMNS: [{
                name: 'createdAt'
            }, {
                name: 'data'
            }, {
                name: 'user',
                format: 'relation'
            }],
            LIST_ORDER: {
                _id: -1
            }
        };
    }

    constructor (config) {
        super(config);
        this.security = this.createMetaSecurity();
        this.meta = this.spawn('meta/MetaParams');
        this.meta.security = this.security;
    }

    getModelClass () {
        return this.getClass('model/DataHistory');
    }

    async actionList () {
        const params = this.getPostParams();
        this.setClassMetaParams(params.class);
        this.meta.view = this.meta.class;
        const ownerQuery = this.getModelQuery(params.id);
        const owner = await this.getModelByQuery(ownerQuery);
        await this.checkAccess(owner);
        const query = this.createModel({owner}).findByOwner().with('user');
        await this.sendGridList(query, {
            request: {
                columns: this.LIST_COLUMNS,
                order: this.LIST_ORDER
            }
        });
    }

    async checkAccess (owner) {
        await this.security.resolveOnHistory(owner);
        if (!this.security.access.canReadHistory()) {
            throw new Forbidden;
        }
    }
};
module.exports.init(module);

const Forbidden = require('areto/error/http/Forbidden');