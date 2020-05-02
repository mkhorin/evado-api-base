/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('../component/BaseController');

module.exports = class MetaController extends Base {

    static getConstants () {
        return {
            METHODS: {
                '*': 'post'
            }
        };
    }

    actionClass () {
        const metaClass = this.getClassFromRequest();
        this.sendJson(metaClass.data);
    }

    actionView () {
        const metaClass = this.getClassFromRequest();
        const metaView = metaClass.getView(this.getPostParam('view'));
        if (!metaView) {
            throw new NotFound('View not found');
        }
        this.sendJson(metaView.data);
    }

    actionListClassSelect () {
        const items = this.filterBySearch(this.baseMeta.classes);
        this.sendJson(MetaSelectHelper.getLabelMap(items));
    }

    actionListViewSelect () {
        const metaClass = this.getClassFromRequest();
        const items = this.filterBySearch(metaClass.views);
        this.sendJson(MetaSelectHelper.getLabelMap(items));
    }

    actionListAttrSelect () {
        const metaClass = this.getClassFromRequest();
        const metaView = metaClass.getView(this.getPostParam('view')) || metaClass;
        const items = this.filterBySearch(metaView.attrs);
        this.sendJson(MetaSelectHelper.getLabelMap(items));
    }

    actionListStateSelect () {
        const {states} = this.getClassFromRequest();
        const items = this.filterBySearch(states);
        this.sendJson(MetaSelectHelper.getLabelMap(items));
    }

    actionListTransitionSelect () {
        const {transitions} = this.getClassFromRequest();
        const items = this.filterBySearch(transitions);
        this.sendJson(MetaSelectHelper.getLabelMap(items));
    }

    getClassFromRequest () {
        const metaClass = this.baseMeta.getClass(this.getPostParam('class'));
        if (metaClass) {
            return metaClass;
        }
        throw new NotFound('Class not found');
    }

    filterBySearch (items) {
        const text = this.getPostParam('search');
        if (typeof text !== 'string' || text.length < 2) {
            return items;
        }
        const regex = new RegExp(EscapeHelper.escapeRegex(text), 'i');
        const result = [];
        for (const item of items) {
            if (regex.test(item.name) || regex.test(item.title)) {
                result.push(item);
            }
        }
        return result;
    }
};
module.exports.init(module);

const EscapeHelper = require('areto/helper/EscapeHelper');
const NotFound = require('areto/error/NotFoundHttpException');
const MetaSelectHelper = require('../component/MetaSelectHelper');