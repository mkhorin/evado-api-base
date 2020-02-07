/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('../component/BaseController');

module.exports = class DataController extends Base {

    static getConstants () {
        return {
            ACTION_VIEW: require('evado/component/meta/MetaActionView'),
            ACTIONS: {
                'utility': require('evado/component/utility/UtilityAction')
            },
            METHODS: {
                '*': 'post'
            }
        };
    }

    constructor (config) {
        super(config);
        this.security = this.createMetaSecurity();
        this.meta = this.spawn('meta/MetaParams');
        this.meta.security = this.security;
        this.extraMeta = this.module.get('extraMeta');
    }

    async actionList () {
        await this.setMetaParams(this.getPostParams(), 'list');
        await this.security.resolveOnList(this.meta.view);
        const query = this.meta.view.find(this.getSpawnConfig()).withListDefaults().withTitle();
        query.setRelatedFilter(this.assignSecurityModelFilter.bind(this));
        const list = this.spawn('component/MetaList', {controller: this, query});
        const items = await list.getList();
        this.sendJson(items);
    }

    async actionRead () {
        const params = this.getPostParams();
        this.setMetaParams(params, 'read');
        const model = await this.getModel(params.id);
        await this.security.resolveOnRead(model);
        this.sendJson(model.output(this.security));
    }

    async actionCreate () {
        const params = this.getPostParams();
        const {view} = this.setMetaParams(params, 'create');
        if (this.meta.class.isAbstract()) {
            throw new BadRequest('Unable to instantiate abstract class');
        }
        await this.security.resolveOnCreate(view);
        const model = view.spawnModel(this.getSpawnConfig());
        await model.setDefaultValues();
        await this.save(params.data, model, 'create');
    }

    async actionUpdate () {
        const params = this.getPostParams();
        this.setMetaParams(params, 'update');
        const model = await this.getModel(params.id);
        await this.security.resolveOnUpdate(model);
        if (!this.security.access.canUpdate()) {
            throw new Forbidden;
        }
        if (model.isTransiting()) {
            throw new Forbidden('Transition in progress...');
        }
        if (model.isReadOnlyState()) {
            throw new Forbidden('Read-only state');
        }
        await this.save(params.data, model, 'update');
    }

    async actionDelete () {
        const params = this.getPostParams();
        this.setMetaParams(params);
        const model = await this.getModel(params.id);
        await this.security.resolveOnDelete(model);
        await model.delete();
        this.sendText(model.getId());
    }

    async actionTransit () {
        const params = this.getPostParams();
        const {transition} = params;
        if (!transition) {
            throw new BadRequest('No transition name specified');
        }
        this.setMetaParams(params);
        const model = await this.getModel(params.id);
        await this.security.resolveOnUpdate(model);
        if (!this.security.access.canUpdate()) {
            throw new Forbidden;
        }
        const transit = this.createMetaTransit();
        await transit.execute(model, transition);
        this.sendText(model.getId());
    }

    getModelQuery (id) {
        const query = super.getModelQuery(id);
        query.setRelatedFilter(this.assignSecurityModelFilter.bind(this));
        return query;
    }

    async assignSecurityModelFilter (query) {
        query.security = this.createMetaSecurity();
        return await query.security.resolveOnList(query.view, {skipAccessException: true})
            ? query.security.access.assignObjectFilter(query)
            : query.where(['FALSE']);
    }

    createMetaSecurity () {
        return this.spawn('meta/MetaSecurity', {
            controller: this
        });
    }

    createMetaTransit () {
        return this.spawn('meta/MetaTransit', {
            controller: this,
            security: this.security
        });
    }

    setMetaParams (params, viewName) {
        this.setClassMetaParams(params.class);
        this.setViewMetaParams(params.view, viewName);
        return this.meta;
    }

    async save (data, model, action) {
        const attrs = this.security.getForbiddenAttrs(action);
        model.load({[model.class.name]: data}, attrs);
        await model.save()
            ? this.sendText(model.getId())
            : this.handleModelError(model);
    }

    handleModelError (model) {
        this.send(this.translateMessageMap(model.getFirstErrorMap()), 400);
    }
};
module.exports.init(module);

const BadRequest = require('areto/error/BadRequestHttpException');
const Forbidden = require('areto/error/ForbiddenHttpException');