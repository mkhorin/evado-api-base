/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class SearchFilterHelper extends Base {

    static getColumns (attrs, depth) {
        let classItems = null;
        let columns = [];
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
                this.setClassData(attr, data, classItems);
                classItems = data.items;
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

    static getRelationData (data, attr, depth) {
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
        data.items = attr.class.states.map(state => ({
            value: state.name,
            text: state.title
        }));
    }

    static setClassData (attr, data, items) {
        data.type = 'selector';
        if (items) {
            data.items = items;
        } else {
            data.items = attr.class.meta.classes.map(item => ({
                value: item.name,
                text: item.title
            }));
        }
    }
};