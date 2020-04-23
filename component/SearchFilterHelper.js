/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class SearchFilterHelper extends Base {

    static getColumns (attrs, depth) {
        const columns = [];
        for (const attr of attrs) {
            let data = {
                name: attr.name,
                label: attr.title,
                type: this.getAttrType(attr),
                format: attr.getFormat(),
                utc: attr.isUTC(),
                translate: `meta.${attr.translationKey}`
            };
            if (attr.relation) {
                depth = depth === undefined ? attr.searchDepth : depth;
                data = this.getRelationData(data, attr, depth);
            } else if (attr.enum) {
                this.setEnumData(attr, data);
            } else if (attr.isState()) {
                this.setStateData(attr, data);
            } else if (attr.isClass()) {
                this.setClassData(attr, data);
            }
            if (data) {
                columns.push(data);
            }
        }
        return columns;
    }

    static getAttrType (attr) {
        if (attr.isNumber()) {
            return 'number';
        }
        if (attr.isText()) {
            return 'string';
        }
        if (attr.isUser()) {
            return 'id';
        }
        if (attr.isDate()) {
            return attr.getDefaultFormat();
        }
        return attr.getType();
    }

    static getRelationData (data, attr, depth, module) {
        if (depth > 0 && attr.relation.refClass) {
            data.columns = this.getColumns(attr.relation.refClass.searchAttrs, depth - 1);
        }
        data.id = attr.id;
        data.type = 'selector';
        return data;
    }

    static setEnumData (attr, data) {
        data.items = attr.enum.getItems();
        data.type = data.items.length ? 'selector' : 'string';
    }

    static setStateData (attr, data) {
        data.type = 'selector';
        data.items = {};
        for (const state of attr.class.states) {
            data.items[state.name] = state.title;
        }
    }

    static setClassData (attr, data) {
        data.type = 'selector';
        data.url = 'api/document/meta/list-class-select';
    }
};