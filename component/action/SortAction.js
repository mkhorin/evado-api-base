/**
 * @copyright Copyright (c) 2021 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('areto/base/Action');

module.exports = class SortAction extends Base {

    async execute () {
        this.controller.checkCsrfToken();
        const request = this.getPostParams();
        const {view} = this.setMetaParams(request);
        await this.controller.security.resolveOnSort(view);
        await this.executeByView(view, request);
    }

    async executeByView (view, request) {
        const attrName = request.column;
        const attrNames = this.controller.extraMeta.getData(view).modalSortNames;
        if (!attrNames.includes(attrName)) {
            throw new BadRequest(`Not modal sortable attribute`);
        }
        const data = this.validateData(request.order);
        const behaviors = view.behaviors.getAllByClassAndAttr(SortOrderBehavior, attrName);
        for (const config of behaviors) {
            await this.updateByBehavior(config, data, view);
        }
        this.sendText('Done');
    }

    validateData (data) {
        if (!data) {
            throw new BadRequest('Invalid sort data');
        }
        for (const key of Object.keys(data)) {
            data[key] = parseInt(data[key]);
            if (!Number.isSafeInteger(data[key])) {
                throw new BadRequest('Invalid order number');
            }
        }
        return data;
    }

    updateByBehavior (config, data, view) {
        const behavior = this.spawn(config, {
            owner: this,
            user: this.user
        });
        return behavior.update(data, view);
    }
};

const SortOrderBehavior = require('evado-meta-base/behavior/SortOrderBehavior');
const BadRequest = require('areto/error/http/BadRequest');