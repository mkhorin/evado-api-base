/**
 * @copyright Copyright (c) 2021 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('areto/base/Action');

module.exports = class SortOwnRelatedAction extends Base {

    async execute () {
        this.controller.checkCsrfToken();
        const request = this.getPostParams();
        const meta = this.setMetaParams(request);
        const master = await this.setMasterMetaParams(request.master);
        const attr = master.attr;
        if (!attr.relation.isSortable()) {
            throw new BadRequest('Not sortable relation');
        }
        const model = master.model;
        if (model.isNew()) {
            throw new BadRequest('Invalid master model');
        }
        await this.controller.security.resolve({
            targetType: Rbac.TARGET_OBJECT,
            target: model,
            actions: [Rbac.UPDATE]
        });
        await this.controller.security.resolveAttrsOnUpdate(model);
        if (!meta.canUpdateAttr(attr, model)) {
            throw new Forbidden('Access denied for modification');
        }
        request.delete
            ? await model.related.deleteOrder(attr)
            : await model.related.updateOrder(attr, this.validateData(request.order));
        this.sendText('Done');
    }

    validateData (data) {
        if (!Array.isArray(data)) {
            throw new BadRequest('Invalid sort data');
        }
        return data;
    }
};

const BadRequest = require('areto/error/http/BadRequest');
const Forbidden = require('areto/error/http/Forbidden');
const Rbac = require('evado/component/security/rbac/Rbac');