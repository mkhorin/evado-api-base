/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class SearchFilterHelper extends Base {

    static getColumns () {
        const columns = this.getAttrColumns(...arguments);
        const descendantColumn = this.getDescendantColumn(...arguments);
        if (descendantColumn) {
            columns.push(descendantColumn);
        }
        return columns;
    }

    static getAttrColumns (cls, depth) {
        const columns = [];
        for (const attr of cls.searchAttrs) {
            columns.push(this.getAttrColumn(attr, depth));
        }
        return columns;
    }

    static getAttrColumn (attr, depth) {
        if (attr.relation) {
            return this.getRelationData(attr, depth);
        }
        if (attr.enum) {
            return this.getEnumData(attr);
        }
        if (attr.isState()) {
            return this.getStateData(attr);
        }
        if (attr.isClass()) {
            return this.getClassData(attr);
        }
        if (attr.isEmbeddedModel()) {
            return this.getEmbeddedModelData(attr);
        }
        return this.getDefaultData(attr);
    }

    static getDescendantColumn (parent, depth) {
        const items = [];
        for (const cls of parent.getDescendants()) {
            const data = this.getDescendantData(cls, parent, depth);
            if (data) {
                items.push(data);
            }
        }
        if (items.length) {
            return {
                name: '_descendant',
                label: 'Attributes of descendant classes',
                type: 'descendant',
                items
            };
        }
    }

    static getDescendantData (cls, parent, depth) {
        const columns = [];
        for (const attr of cls.searchAttrs) {
            if (!parent.hasAttr(attr.name)) {
                columns.push(this.getAttrColumn(attr, depth));
            }
        }
        if (columns.length) {
            return {
                value: cls.name,
                text: `${cls.label} (${cls.name})`,
                columns
            };
        }
    }

    static getDefaultData (attr) {
        return {
            name: attr.name,
            label: attr.title,
            type: this.getAttrType(attr),
            format: attr.getFormat(),
            utc: attr.isUTC(),
            translate: `meta.${attr.translationKey}`
        };
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

    static getRelationData (attr, depth = attr.searchDepth) {
        const data = this.getDefaultData(attr);
        if (depth > 0 && attr.relation.refClass) {
            data.columns = this.getColumns(attr.relation.refClass, depth - 1);
        }
        data.id = attr.id;
        data.type = 'selector';
        return data;
    }

    static getEnumData (attr) {
        const data = this.getDefaultData(attr);
        data.items = attr.enum.getItems();
        data.valueType = attr.isNumber() ? 'number' : 'string';
        data.type = data.items.length ? 'selector' : data.valueType;
        return data;
    }

    static getStateData (attr) {
        const data = this.getDefaultData(attr);
        data.type = 'selector';
        data.items = {};
        for (const state of attr.class.states) {
            data.items[state.name] = state.title;
        }
        return data;
    }

    static getClassData (attr) {
        const data = this.getDefaultData(attr);
        data.type = 'selector';
        data.url = 'api/base/meta/list-class-select';
        data.valueType = 'string';
        return data;
    }

    static getEmbeddedModelData (attr) {
        const data = this.getDefaultData(attr);
        if (attr.isUser()) {
            data.type = 'selector';
            data.url = 'office/user/list-select';
        } else {
            data.type = 'id';
        }
        return data;
    }
};