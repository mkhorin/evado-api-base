/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('evado/component/meta/ExtraMeta');

module.exports = class ExtraMeta extends Base {

    constructor (config) {
        super({
            file: {
                download: 'api/base/file/download',
                thumbnail: 'api/base/file/thumbnail',
                upload: 'api/base/file/upload',
                delete: 'api/base/file/delete',
                attrHandler: 'File'
            },
            s3: {
                download: 'api/base/s3/download',
                upload: 'api/base/s3/upload',
                delete: 'api/base/s3/delete',
                attrHandler: 'S3',
                preload: true,
                uploadMethod: 'PUT'
            },
            signature: {
                dataUrl: 'api/base/signature/data',
                signUrl: 'api/base/signature/create',
            },
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
        data.filterColumns = SearchFilterHelper.getColumns(item);
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
            commands: this.getViewCommands(view),
            signature: this.getSignatureData(view)
        };
    }

    getViewCommands (view) {
        return Object.assign({
            create: true,
            edit: true,
            delete: true
        }, view.options.commands);
    }

    getSignatureData (view) {
        const config = view.behaviors.getByClass(SignatureBehavior);
        if (config) {
            return {
                dataUrl: this.signature.dataUrl,
                signUrl: this.signature.signUrl,
                ...config.options
            };
        }
    }

    getModalSortNames (view) {
        const configs = view.behaviors.getAllByClass(SortOrderBehavior);
        const names = ArrayHelper.getPropertyValues('attrName', configs);
        const result = [];
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
            columns.push(this.getKeyGridColumn(view));
        }
        for (const attr of view.attrs) {
            columns.push(this.getGridColumn(attr));
        }
        return columns;
    }

    getKeyGridColumn (view) {
        return {
            name: view.getKey(),
            label: 'ID',
            searchable: true,
            sortable: true,
            hidden: true
        };
    }

    getGridColumn (attr) {
        const data = {
            name: attr.name,
            label: attr.title,
            hint: attr.extHint || attr.hint,
            type: attr.getType(),
            titleName: `${attr.name}_title`,
            searchable: attr.data.commonSearchable,
            sortable: attr.sortable,
            escape: attr.escaping,
            grouping: attr.sortable,
            format: this.getAttrFormat(attr),
            hidden: this.isHiddenAttr(attr),
            hideEmpty: attr.isHideEmpty(),
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
            format = {};
        }
        if (!format.name) {
            format.name = this.getRelationAttrFormatName(attr);
        }
        if (!format.url && attr.commandMap.edit) {
            format.url = this.urlManager.resolve(['model/update', {
                c: attr.relation.refClass.id,
                v: attr.eagerView.editView.viewName
            }]);
        }
        return format;
    }

    getRelationAttrFormatName (attr) {
        return attr.isThumbnail() ? 'thumbnail' : attr.isStringView() ? 'string' :  'link';
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
                case 'edit': actions.push(Rbac.UPDATE); break;
            }
        }
        return actions.length ? actions : null;
    }

    getModelData (model) {
        return this.getData(model.view) || this.getData(model.class);
    }

    // FILE

    getFileAttrData (view) {
        const config = view.class.behaviors.fileItem;
        if (!config) {
            return null;
        }
        const data = {
            imageOnly: config.imageOnly,
            maxSize: config.maxSize,
            minSize: config.minSize,
            extensions: config.extensions,
            types: config.types,
            accept: config.accept,
            nameAttr: config.nameAttr?.name,
            ...this.getFileOptions(config.Class)
        };
        const params = `c=${view.class.name}${view === view.class ? '' : `&v=${view.name}`}`;
        data.download = data.download ? `${data.download}?${params}` : null;
        data.upload = data.upload ? `${data.upload}?${params}` : null;
        data.delete = data.delete ? `${data.delete}?${params}` : null;
        data.thumbnail = this.isStorageThumbnails(view)
            ? `${data.thumbnail}?${params}`
            : data.thumbnail ? data.download : null;
        return data;
    }

    getFileOptions (Class) {
        return Class === S3Behavior || Class.prototype instanceof S3Behavior ? this.s3 : this.file;
    }

    isStorageThumbnails (view) {
        return view.createModel({module: this.module}).createFileBehavior()?.isThumbnails();
    }

    getModelFileData (model, thumbnailSize) {
        const id = model.getId();
        if (!id) {
            return null;
        }
        const behavior = model.createFileBehavior();
        if (!behavior) {
            return null;
        }
        const data = this.getModelData(model).file;
        const result = {
            id,
            name: behavior.getName() || id,
            download: data.download + '&id=' + id,
            size: behavior.getSize()
        };
        if (data.thumbnail && behavior.isImage()) {
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
        const config = attr.relation.refClass.behaviors.fileItem;
        if (!config) {
            return value;
        }
        const data = this.getData(attr.relation.refClass).file;
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
const S3Behavior = require('evado-meta-base/behavior/S3Behavior');
const SignatureBehavior = require('evado-meta-base/behavior/SignatureBehavior');
const SortOrderBehavior = require('evado-meta-base/behavior/SortOrderBehavior');