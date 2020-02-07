/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('evado/component/meta/ExtraMeta');

module.exports = class ExtraMeta extends Base {

    init () {
        super.init();
        this.hasThumbnail = this.module.get('fileStorage').hasThumbnail();
        this.urlManager = this.module.get('urlManager');
    }

    prepare () {
        this.prepareMeta(this.metaHub.get('document'));
    }

    getData ({id}) {
        return Object.prototype.hasOwnProperty.call(this._data, id) ? this._data[id] : null;
    }

    getPageTitle ({node, view}) {
        return node.data.label || (view && view.data.label) || node.title;
    }

    getPageDescription ({node, view}) {
        return node.data.description || (view && view.data.description);
    }

    prepareMeta (meta) {
        try {
            this._data = {};
            meta.classes.forEach(this.prepareClass, this);
        } catch (err) {
            this.log('error', err);
        }
    }

    prepareClass (item) {
        const data = this.getClassData(item);
        this._data[item.id] = data;
        item.views.forEach(view => this.prepareView(view, data));
    }

    getClassData (item) {
        const data = this.getViewData(item);
        data.searchColumns = SearchFilterHelper.getColumns(item.searchAttrs);
        return data;
    }

    prepareView (view, classData) {
        const data = this.getViewData(view);
        data.searchColumns = classData.searchColumns;
        this._data[view.id] = data;
    }

    getViewData (view) {
        const columns = this.getGridColumns(view);
        return {
            columns,
            columnMap: IndexHelper.indexObjects(columns, 'name'),
            modalSortNames: this.getModalSortNames(view),
            file: this.getFileAttrData(view),
            commands: view.getOption('commands')
        };
    }

    getModalSortNames (view) {
        const result = [];
        const Behavior = require('evado-meta-document/behavior/SortOrderBehavior');
        const behaviors = view.class.getBehaviorsByClass(Behavior);
        const names = ArrayHelper.getPropertyValues(behaviors, 'attrName');
        for (const attr of view.attrs) {
            if (names.includes(attr.name) && !attr.isReadOnly()) {
                result.push(attr.name);
            }
        }
        return result;
    }

    getGridColumns (view) {
        const columns = [];
        if (!view.hasKeyAttr()) {
            columns.push({
                name: view.getKey(),
                label: 'ID',
                searchable: true,
                sortable: true,
                hidden: true
            });
        }
        for (const attr of view.attrs) {
            columns.push(this.getGridColumn(attr));
        }
        return columns;
    }

    getGridColumn (attr) {
        const data = {
            name: attr.name,
            label: attr.title,
            type: attr.getType(),
            searchable: attr.data.commonSearchable,
            sortable: attr.data.sortable,
            escape: attr.escaping,
            grouping: attr.data.sortable,
            format: this.getAttrFormat(attr),
            hidden: attr.isHidden(),
            translate: 'meta.' + attr.translationKey,
            maxCellHeight: attr.getOption('maxCellHeight')
        };
        if (attr.isDate()) {
            data.utc = attr.isUTC();
            data.momentFormat = attr.getOption('momentFormat');
        }
        return data;
    }

    getAttrFormat (attr) {
        if (attr.relation) {
            return this.getRelationAttrFormat(attr);
        }
        const format = attr.getFormat();
        return !format && attr.isFile() ? 'thumbnail' : format;
    }

    getRelationAttrFormat (attr) {
        let format = attr.getFormat();
        if (typeof format === 'string') {
            format = {name: format};
        }
        if (!format) {
            format = {name: attr.isThumbnail() ? 'thumbnail' : 'link'};
        }
        if (!format.url) {
            format.url = this.urlManager.resolve(['model/update', {c: attr.relation.refClass.id}]);
        }
        return format;
    }

    prepareClassAttr (item) {
        this._data[item.id] = this.getClassAttrData(item);
    }

    getClassAttrData () {
        return {};
    }

    getCommandData (attr, data) {
        return {
            link: true,
            unlink: true,
            create: true,
            update: true,
            delete: true,
            ...data.commands,
            ...attr.options.commands
        };
    }

    getModelData (model) {
        return this.getData(model.view) || this.getData(model.class);
    }

    getFileAttrData (view) {
        const config = view.class.FileBehaviorConfig;
        if (!config) {
            return null;
        }
        const param = `v=${view.getViewId()}`;
        const fileAttr = view.class.getFileBehaviorAttr();
        const viewAttr = view.getAttr(fileAttr.name) || fileAttr;
        const thumbnail = this.hasThumbnail && viewAttr.getThumbnail();
        return {
            imageOnly: config.imageOnly,
            maxSize: config.maxSize,
            minSize: config.minSize,
            extensions: config.extensions,
            mimeTypes: config.mimeTypes,
            accept: config.accept,
            nameAttr: config.nameAttr,
            delete: `file/delete`,
            upload: `api/document/file/upload?${param}`,
            download: `api/document/file/download?${param}`,
            thumbnail: thumbnail ? `api/document/file/thumbnail?${param}` : null
        };
    }

    getModelFileData (model, thumbnailSize) {
        const id = model.getId();
        const config = model.class.FileBehaviorConfig;
        if (!id || !config) {
            return null;
        }
        const data = this.getModelData(model).file;
        const file = model.get('file');
        const result = {
            name: model.get('name') || file,
            download: data.download + '&id=' + id,
            size: config.Class.getSize(model),
            file, id
        };
        if (data.thumbnail && config.Class.isImage(model)) {
            result.thumbnail = data.thumbnail + '&id=' + id;
            if (thumbnailSize) {
                result.thumbnail += '&s=' + thumbnailSize;
            }
        }
        return result;
    }
};

const ArrayHelper = require('areto/helper/ArrayHelper');
const IndexHelper = require('areto/helper/IndexHelper');
const SearchFilterHelper = require('./SearchFilterHelper');