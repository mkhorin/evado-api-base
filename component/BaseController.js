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

    getModelQuery (id) {
        return this.meta.view.findById(id, this.getSpawnConfig()).withReadData();
    }

    async getModel (id) {
        const model = await this.getModelQuery(id).one();
        if (!model) {
            throw new NotFound('Object not found', `${id}.${this.meta.view.id}`);
        }
        this.meta.model = model;
        return model;
    }

    getMetaClass (name) {
        const metaClass = this.baseMeta.getClass(name);
        if (!metaClass) {
            throw new BadRequest(`Class not found: ${name}`);
        }
        return metaClass
    }

    getMetaView (name, metaClass, defaults) {
        if (!name) {
            return (defaults && metaClass.getView(defaults)) || metaClass;
        }
        const view = metaClass.getView(name);
        if (!view) {
            throw new BadRequest(`View not found: ${name}.${metaClass.id}`);
        }
        return view;
    }

    setClassMetaParams (name) {
        this.meta.class = this.getMetaClass(name);
    }

    setViewMetaParams (name, defaultName) {
        this.meta.view = this.getMetaView(name, this.meta.class, defaultName);
    }

    setAttrMetaParams (param = this.getQueryParam('a')) {
        const [attrName, viewName, className] = String(param).split('.');
        this.setClassMetaParams(className);
        this.setViewMetaParams(viewName);
        this.meta.attr = this.meta.view.getAttr(attrName);
        if (!this.meta.attr) {
            throw new BadRequest(`Attribute not found: ${attrName}.${this.meta.view.id}`);
        }
    }
};

const BadRequest = require('areto/error/BadRequestHttpException');
const NotFound = require('areto/error/NotFoundHttpException');