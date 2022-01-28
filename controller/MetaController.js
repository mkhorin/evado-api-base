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

    actionClasses () {
        const names = this.getPostParam('classes');
        if (!names) {
            return this.sendJson(this.getAllClassesData());
        }
        if (Array.isArray(names)) {
            return this.sendJson(this.getClassDataByNames(names));
        }
        throw new BadRequest('Invalid classes');
    }

    actionClass () {
        this.sendJson(this.getClassFromRequest().data);
    }

    actionView () {
        const cls = this.getClassFromRequest();
        const view = cls.getView(this.getPostParam('view'));
        if (!view) {
            throw new NotFound('View not found');
        }
        this.sendJson(view.data);
    }

    actionListClassSelect () {
        const ancestor = this.baseMeta.getClass(this.getPostParam('ancestor'));
        const classes = ancestor ? ancestor.getActiveDescendants() : this.baseMeta.classes;
        this.sendJson(MetaSelectHelper.getLabelMap(this.filterBySearch(classes)));
    }

    actionListViewSelect () {
        const cls = this.getClassFromRequest();
        const items = this.filterBySearch(cls.views);
        this.sendJson(MetaSelectHelper.getLabelMap(items));
    }

    actionListAttrSelect () {
        const cls = this.getClassFromRequest();
        const view = cls.getView(this.getPostParam('view')) || cls;
        const items = this.filterBySearch(view.attrs);
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
        const cls = this.baseMeta.getClass(this.getPostParam('class'));
        if (cls) {
            return cls;
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

    getAllClassesData () {
        const result = [];
        for (const {data} of this.baseMeta.classes) {
            result.push(data);
        }
        return result;
    }

    getClassDataByNames (names) {
        const result = [];
        for (const name of names) {
            const cls = this.baseMeta.getClass(name);
            if (!cls) {
                throw new BadRequest(`Class not found: ${name}`);
            }
            result.push(cls.data);
        }
        return result;
    }
};
module.exports.init(module);

const BadRequest = require('areto/error/http/BadRequest');
const EscapeHelper = require('areto/helper/EscapeHelper');
const NotFound = require('areto/error/http/NotFound');
const MetaSelectHelper = require('../component/MetaSelectHelper');