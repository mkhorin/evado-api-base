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
                this.setRelationData(attr, data, depth);
            } else if (attr.enum) {
                this.setEnumData(attr, data);
            } else if (attr.isState()) {
                this.setStateData(attr, data);
            } else if (attr.isClass()) {
                this.setClassData(attr, data);
            } else if (attr.isEmbeddedModel()) {
                this.setEmbeddedModelData(attr, data);
            }
            if (data) {
                columns.push(data);
            }
        }
        return columns;
    }

    static getAttrType (attr) {
        if (attr.isDate()) {
            return attr.getDefaultFormat();
        }
        if (attr.isNumber()) {
            return 'number';
        }
        if (attr.isText()) {
            return 'string';
        }
        return attr.getType();
    }

    static setRelationData (attr, data, depth) {
        if (depth > 0 && attr.relation.refClass) {
            data.columns = this.getColumns(attr.relation.refClass.searchAttrs, depth - 1);
        }
        data.id = attr.id;
        data.type = 'selector';
    }

    static setEnumData (attr, data) {
        data.items = attr.enum.getItems();
        data.valueType = attr.isNumber() ? 'number' : 'string';
        data.type = data.items.length ? 'selector' : data.valueType;
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
        data.url = 'api/base/meta/list-class-select';
    }

    static setEmbeddedModelData (attr, data) {
        if (attr.isUser()) {
            data.type = 'selector';
            data.url = 'office/user/list-select';
        } else {
            data.type = 'id';
        }
    }
};