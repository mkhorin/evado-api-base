/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('evado/component/base/BaseController');

module.exports = class BaseController extends Base {

    constructor (config) {
        super(config);
        this.docMeta = this.module.getMeta('document');
    }

    getModelQuery (id) {
        return this.meta.view.findById(id, this.getSpawnConfig()).withFormData();
    }

    async getModel (id) {
        const model = await this.getModelQuery(id).one();
        if (!model) {
            throw new NotFound('Object not found', `${id}.${this.meta.view.id}`);
        }
        this.meta.model = model;
        return model;
    }

    setClassMetaParams (className) {
        this.meta.class = this.docMeta.getClass(className);
        if (!this.meta.class) {
            throw new BadRequest('Class not found', className);
        }
    }

    setViewMetaParams (viewName, defaultViewName) {
        let view = null;
        if (viewName) {
            view = this.meta.class.getView(viewName);
            if (!view) {
                throw new BadRequest('View not found', `${viewName}.${this.meta.class.id}`);
            }
        } else if (defaultViewName) {
            view = this.meta.class.getView(defaultViewName);
        }
        this.meta.view = view || this.meta.class;
    }

    setAttrMetaParams (param = this.getQueryParam('a')) {
        const [attrName, viewName, className] = String(param).split('.');
        this.setClassMetaParams(className);
        this.setViewMetaParams(viewName);
        this.meta.attr = this.meta.view.getAttr(attrName);
        if (!this.meta.attr) {
            throw new BadRequest('Unknown meta attribute', `${attrName}.${this.meta.view.id}`);
        }
    }
};

const BadRequest = require('areto/error/BadRequestHttpException');
const NotFound = require('areto/error/NotFoundHttpException');