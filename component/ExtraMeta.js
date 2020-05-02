/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('evado/component/meta/ExtraMeta');

module.exports = class ExtraMeta extends Base {

    constructor (config) {
        super({
            downloadUrl: 'api/base/file/download',
            thumbnailUrl: 'api/base/file/thumbnail',
            uploadUrl: 'api/base/file/upload',
            ...config
        });
    }

    init () {
        super.init();
        this.urlManager = this.module.get('urlManager');
    }

    prepare () {
        this.prepareMeta(this.metaHub.get('base'));
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
        data.filterColumns = SearchFilterHelper.getColumns(item.searchAttrs);
        return data;
    }

    prepareView (view, classData) {
        const data = this.getViewData(view);
        data.filterColumns = classData.filterColumns;
        this._data[view.id] = data;
    }

    getViewData (view) {
        const columns = this.getGridColumns(view);
        return {
            columns,
            columnMap: IndexHelper.indexObjects(columns, 'name'),
            modalSortNames: this.getModalSortNames(view),
            file: this.getFileAttrData(view),
            commands: this.getViewCommands(view)
        };
    }

    getViewCommands (view) {
        return Object.assign({
            create: true,
            edit: true,
            delete: true
        }, view.options.commands);
    }

    getModalSortNames (view) {
        const result = [];
        const Behavior = require('evado-meta-base/behavior/SortOrderBehavior');
        const behaviors = view.getBehaviorsByClass(Behavior);
        const names = ArrayHelper.getPropertyValues('attrName', behaviors);
        for (const attr of view.attrs) {
            if (attr.isSortable() && !attr.isReadOnly() && names.includes(attr.name)) {
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
            titleName: `${attr.name}_title`,
            searchable: attr.data.commonSearchable,
            sortable: attr.data.sortable,
            escape: attr.escaping,
            grouping: attr.data.sortable,
            format: this.getAttrFormat(attr),
            hidden: attr.isHidden(),
            translate: 'meta.' + attr.translationKey,
            maxCellHeight: attr.getOption('maxCellHeight'),
            momentFormat: attr.getOption('momentFormat')
        };
        if (attr.isDate()) {
            data.utc = attr.isUTC();
        }
        return data;
    }

    getAttrFormat (attr) {
        if (attr.relation) {
            return this.getRelationAttrFormat(attr);
        }
        const format = attr.getFormat();
        if (format) {
            return format;
        }
        if (attr.isFile()) {
            return 'thumbnail';
        }
        if (attr.isTime()) {
            return 'time';
        }
        if (attr.isClass() || attr.isEmbeddedModel() || attr.isState()) {
            return 'title';
        }
    }

    getRelationAttrFormat (attr) {
        let format = attr.getFormat();
        if (typeof format === 'string') {
            format = {name: format};
        }
        if (!format) {
            format = {name: attr.isThumbnail() ? 'thumbnail' : 'link'};
        }
        if (!format.url && attr.commandMap.edit) {
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

    getModelData (model) {
        return this.getData(model.view) || this.getData(model.class);
    }

    getFileAttrData (view) {
        const config = view.class.FileBehaviorConfig;
        if (!config) {
            return null;
        }
        const model = view.spawnModel({module: this.module});
        const fileBehavior = model.createBehavior(config);
        const param = `v=${view.getViewId()}`;
        const download = `${this.downloadUrl}?${param}`;
        const attr = view.getAttr(config.attrName) || view.class.getAttr(config.attrName);
        const size = attr.options.thumbnail || view.options.thumbnail;
        const enabled = fileBehavior.getStorage().isThumbnailEnabled();
        const thumbnail = enabled ? `${this.thumbnailUrl}?${param}` : download;
        return {
            imageOnly: config.imageOnly,
            maxSize: config.maxSize,
            minSize: config.minSize,
            extensions: config.extensions,
            mimeTypes: config.mimeTypes,
            accept: config.accept,
            nameAttr: config.nameAttr,
            delete: `file/delete`,
            upload: `${this.uploadUrl}?${param}`,
            download,
            thumbnail
        };
    }

    getModelFileData (model, thumbnailSize) {
        const id = model.getId();
        const config = model.class.FileBehaviorConfig;
        if (!id || !config) {
            return null;
        }
        const fileBehavior = model.createBehavior(config);
        const data = this.getModelData(model).file;
        const result = {
            id,
            name: model.get(config.Class.NAME_ATTR) || id,
            download: data.download + '&id=' + id,
            size: config.Class.getSize(model)
        };
        if (data.thumbnail && config.Class.isImage(model)) {
            result.thumbnail = data.thumbnail + '&id=' + id;
            if (thumbnailSize) {
                result.thumbnail += '&s=' + thumbnailSize;
            }
        }
        return result;
    }

    getRelationThumbnailData (attr, value) {
        if (!value) {
            return value;
        }
        const data = this.getData(attr.relation.refClass).file;
        const config = attr.relation.refClass.FileBehaviorConfig;
        if (!config) {
            return value;
        }
        value = value.toString();
        const result = {
            id: value,
            thumbnail: (data.thumbnail || data.download) + '&id=' + value,
            name: value
        };
        if (attr.options.thumbnail) {
            result.thumbnail += '&s=' + attr.options.thumbnail;
        }
        return result;
    }
};

const ArrayHelper = require('areto/helper/ArrayHelper');
const IndexHelper = require('areto/helper/IndexHelper');
const SearchFilterHelper = require('./SearchFilterHelper');