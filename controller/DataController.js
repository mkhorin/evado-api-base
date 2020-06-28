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

    async actionCount () {
        this.setMetaParams(this.getPostParams(), 'list');
        await this.security.resolveOnList(this.meta.view);
        const query = this.meta.view.find(this.getSpawnConfig());
        query.setRelatedFilter(this.assignSecurityModelFilter.bind(this));
        const list = this.spawn('component/MetaList', {controller: this, query});
        const counter = await list.count();
        this.sendText(counter);
    }

    async actionList () {
        this.setMetaParams(this.getPostParams(), 'list');
        await this.security.resolveOnList(this.meta.view);
        const query = this.meta.view.find(this.getSpawnConfig()).withListData().withTitle();
        query.setRelatedFilter(this.assignSecurityModelFilter.bind(this));
        const list = this.spawn('component/MetaList', {controller: this, query});
        const items = await list.getList();
        this.sendJson(items);
    }

    async actionListRelated () {
        const request = this.getPostParams();
        this.setMetaParams(request, 'list');
        await this.setMasterParams(request.master);
        await this.security.resolveOnList(this.meta.view);
        const query = this.meta.view.find(this.getSpawnConfig()).withListData().withTitle();
        query.setRelatedFilter(this.assignSecurityModelFilter.bind(this));
        await this.master.attr.relation.setQueryByModel(query, this.master.model);
        const list = this.spawn('component/MetaList', {controller: this, query});
        const items = await list.getList();
        this.sendJson(items);
    }

    async actionListSelect () {
        this.setMetaParams(this.getPostParams(), 'list');
        await this.security.resolveOnList(this.meta.view);
        const query = this.meta.view.find(this.getSpawnConfig()).withTitle();
        const list = this.spawn('meta/MetaSelect2', {controller: this, query});
        const items = await list.getList();
        this.sendJson(items);
    }

    async actionRead () {
        const params = this.getPostParams();
        this.setMetaParams(params, 'edit');
        const model = await this.getModel(params.id);
        await this.security.resolveOnRead(model);
        this.sendJson(model.output(this.security));
    }

    async actionDefaults () {
        const params = this.getPostParams();
        const {view} = this.setMetaParams(params, 'create'); // read defaults to create
        await this.security.resolveOnCreate(view);
        const model = view.createModel(this.getSpawnConfig());
        await model.setDefaultValues();
        this.sendJson(model.output(this.security));
    }

    async actionCreate () {
        const params = this.getPostParams();
        const {view} = this.setMetaParams(params, 'create');
        if (this.meta.class.isAbstract()) {
            throw new BadRequest('Unable to instantiate abstract class');
        }
        await this.security.resolveOnCreate(view);
        const model = view.createModel(this.getSpawnConfig());
        await model.setDefaultValues();
        await this.save(params, model, 'create');
    }

    async actionUpdate () {
        const params = this.getPostParams();
        this.setMetaParams(params, 'edit');
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
        await this.save(params, model, 'update');
    }

    async actionDelete () {
        const params = this.getPostParams();
        this.setMetaParams(params);
        const model = await this.getModel(params.id);
        await this.security.resolveOnDelete(model);
        await model.delete();
        this.sendText(model.getId());
    }

    async actionDeleteMultiple () {
        const params = this.getPostParams();
        this.setMetaParams(params);
        if (!Array.isArray(params.ids)) {
            throw new BadRequest('Invalid ID array');
        }
        const result = [];
        for (const id of params.ids) {
            try {
                const model = await this.getModel(id);
                await this.security.resolveOnDelete(model);
                await model.delete();
                result.push(id);
            } catch (err) {
                this.log('error', `Deletion failed: ${id}.${this.meta.class.id}:`, err);
            }
        }
        this.sendText(result.join());
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
        if (model.isTransiting()) {
            throw new Forbidden('Transition in progress...');
        }
        const transit = this.createMetaTransit();
        await transit.execute(model, transition);
        await model.hasError()
            ? this.handleModelError(model)
            : this.sendText(model.getId());
    }

    getModelQuery (id) {
        const query = super.getModelQuery(id);
        if (this.meta.defaultViewAssigned) {
            query.withStateView();
        }
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

    setMetaParams (data, defaultView) {
        this.setClassMetaParams(data.class);
        this.setViewMetaParams(data.view, defaultView);
        this.meta.defaultViewAssigned = !data.view;
        return this.meta;
    }

    async setMasterParams (data) {
        if (!data) {
            throw new BadRequest('Master data not found');
        }
        const master = {};
        this.master = master;
        master.class = this.baseMeta.getClass(data.class);
        if (!master.class) {
            throw new BadRequest(`Master class not found: ${data.class}`);
        }
        master.view = data.view ? master.class.getView(data.view) : master.class;
        if (!master.view) {
            throw new BadRequest(`Master view not found: ${data.view}.${master.class}`);
        }
        master.attr = master.view.getAttr(data.attr);
        if (!master.attr) {
            throw new BadRequest(`Master attribute not found: ${data.attr}.${master.view.id}`);
        }
        const relation = master.attr.relation;
        if (!relation) {
            throw new BadRequest(`Master relation not found: ${master.attr.id}`);
        }
        if (relation.refClass !== this.meta.class) {
            throw new BadRequest(`Invalid master: ${master.attr.id}`);
        }
        if (!data.id) {
            master.model = master.view.createModel(this.getSpawnConfig());
            return master;
        }
        master.model = await master.view.findById(data.id, this.getSpawnConfig()).one();
        if (!master.model) {
            throw new BadRequest(`Master instance not found: ${data.id}.${master.view.id}`);
        }
        return master;
    }

    async save ({data}, model, action) {
        const excludes = this.security.getForbiddenAttrs(action);
        model.load(data, excludes);
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