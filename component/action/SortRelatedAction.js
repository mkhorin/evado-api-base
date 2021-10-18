/**
 * @copyright Copyright (c) 2021 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('./SortAction');

module.exports = class SortRelatedAction extends Base {

    async execute () {
        this.controller.checkCsrfToken();
        const request = this.getPostParams();
        const meta = this.setMetaParams(request);
        const master = await this.setMasterMetaParams(request.master);
        meta.class = master.attr.relation.refClass;
        meta.view = master.attr.getRefView('listView', 'list');
        await this.security.resolveOnList(meta.view, {
            actions: [Rbac.UPDATE]
        });
        await this.executeByView(master.attr.listView, request);
    }
};

const Rbac = require('evado/component/security/rbac/Rbac');