/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('evado/component/base/BaseController');

module.exports = class BaseController extends Base {

    constructor (config) {
        super(config);
        this.baseMeta = this.module.getBaseMeta();
    }

    async canUpload () {
        if (!await this.user.can('moduleApiBaseUpload')) {
            throw new Forbidden;
        }
    }

    getModel (id) {
        return this.getModelByQuery(this.getModelQuery(id));
    }

    async getModelByQuery (query) {
        const model = await query.one();
        if (!model) {
            throw new NotFound('Object not found');
        }
        this.meta.model = model;
        return model;
    }

    getModelQuery (id) {
        return this.meta.view.createQuery(this.getSpawnConfig()).byId(id);
    }

    getMetadataClass (name) {
        const cls = this.baseMeta.getClass(name);
        if (!cls) {
            throw new BadRequest(`Class not found: ${name}`);
        }
        return cls;
    }

    getMetadataView (name, cls, defaults) {
        if (!name) {
            return (defaults && cls.getView(defaults)) || cls;
        }
        const view = cls.getView(name);
        if (!view) {
            throw new BadRequest(`View not found: ${name}.${cls.id}`);
        }
        return view;
    }

    setClassMetaParams (name) {
        this.meta.class = this.getMetadataClass(name);
    }

    setViewMetaParams (name, defaultName) {
        this.meta.view = this.getMetadataView(name, this.meta.class, defaultName);
    }

    setAttrMetaParams (data) {
        const {a} = this.getQueryParams();
        const [attrName, viewName, className] = String(data || a).split('.');
        this.setClassMetaParams(className);
        this.setViewMetaParams(viewName);
        this.meta.attr = this.meta.view.getAttr(attrName);
        if (!this.meta.attr) {
            throw new BadRequest(`Attribute not found: ${attrName}.${this.meta.view.id}`);
        }
    }

    createMetaSecurity (config) {
        return this.spawn('meta/MetaSecurity', {
            controller: this,
            ...config
        });
    }
};

const BadRequest = require('areto/error/http/BadRequest');
const Forbidden = require('areto/error/http/Forbidden');
const NotFound = require('areto/error/http/NotFound');