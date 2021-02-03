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
        return ObjectHelper.getValue(id, this._data);
    }

    getAttrData ({id}) {
        return ObjectHelper.getValue(id, this._attrData);
    }

    getPageTitle ({node, view}) {
        return node.data.label || view?.data.label || node.title;
    }

    getPageDescription ({node, view}) {
        return node.data.description || view?.data.description;
    }

    prepareMeta (meta) {
        try {
            this._attrData = {};
            this._data = {};
            meta.classes.forEach(this.prepareClass, this);
        } catch (err) {
            this.log('error', err);
        }
    }

    prepareClass (cls) {
        const data = this.getClassData(cls);
        this._data[cls.id] = data;
        cls.attrs.forEach(this.prepareAttr, this);
        cls.views.forEach(view => this.prepareView(view, data));
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
        view.attrs.forEach(this.prepareAttr, this);
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
            hint: attr.extHint || attr.hint,
            type: attr.getType(),
            titleName: `${attr.name}_title`,
            searchable: attr.data.commonSearchable,
            sortable: attr.data.sortable,
            escape: attr.escaping,
            grouping: attr.data.sortable,
            format: this.getAttrFormat(attr),
            hidden: this.isHiddenAttr(attr),
            translate: `meta.${attr.view.translationKey}`,
            translateData: attr.translatable ? `meta.${attr.translationKey}` : false,
            maxCellHeight: attr.getOption('maxCellHeight'),
            momentFormat: attr.getOption('momentFormat')
        };
        if (attr.isDate()) {
            data.utc = attr.isUTC();
        }
        return data;
    }

    isHiddenAttr (attr) {
        return attr.isHidden() || (attr.isClassAttr() && attr.isBackRef() && !attr.isEagerLoading());
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
        if (attr.enum || attr.isClass() || attr.isEmbeddedModel() || attr.isState()) {
            return 'title';
        }
    }

    getRelationAttrFormat (attr) {
        let format = attr.getFormat();
        if (typeof format === 'string') {
            format = {name: format};
        }
        if (!format) {
            format = {name: attr.isThumbnail() ? 'thumbnail' : attr.isStringView() ? 'string' :  'link'};
        }
        if (!format.url && attr.commandMap.edit) {
            format.url = this.urlManager.resolve(['model/update', {
                c: attr.relation.refClass.id,
                v: attr.eagerView.editView.viewName
            }]);
        }
        return format;
    }

    prepareAttr (attr) {
        this._attrData[attr.id] = {
            actions: this.createAttrCommandActions(attr)
        };
    }

    createAttrCommandActions (attr) {
        const actions = [];
        for (const command of Object.keys(attr.commandMap)) {
            switch (command) {
                case 'create': actions.push(Rbac.CREATE); break;
                case 'delete': actions.push(Rbac.DELETE); break;
            }
        }
        return actions.length ? actions : null;
    }

    getModelData (model) {
        return this.getData(model.view) || this.getData(model.class);
    }

    getFileAttrData (view) {
        const config = view.class.FileBehaviorConfig;
        if (!config) {
            return null;
        }
        const model = view.createModel({module: this.module});
        const fileBehavior = model.createBehavior(config);
        const param = `c=${view.class.name}${view === view.class ? '' : `&v=${view.name}`}`;
        const download = `${this.downloadUrl}?${param}`;
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
const ObjectHelper = require('areto/helper/ObjectHelper');
const Rbac = require('evado/component/security/rbac/Rbac');
const SearchFilterHelper = require('./SearchFilterHelper');