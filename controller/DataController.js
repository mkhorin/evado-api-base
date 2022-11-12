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
                'sort': require('../component/action/SortAction'),
                'sortRelated': require('../component/action/SortRelatedAction'),
                'sortOwnRelated': require('../component/action/SortOwnRelatedAction'),
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
        const query = this.meta.view.createQuery(this.getSpawnConfig());
        const list = this.spawn('component/MetaList', {
            controller: this,
            query
        });
        const counter = await list.count();
        this.sendText(counter);
    }

    async actionList () {
        await this.resolveListParams();
        await this.security.resolveAttrsOnList(this.meta.view);
        const query = this.meta.view.createQuery(this.getSpawnConfig()).withListData().withTitle();
        await this.resolveListFilter(query);
        const list = this.spawn('component/MetaList', {
            controller: this,
            query
        });
        const items = await list.getList();
        this.sendJson(items);
    }

    async actionListSelect () {
        await this.resolveListParams();
        const query = this.meta.view.createQuery(this.getSpawnConfig()).withTitle();
        await this.resolveListFilter(query);
        const list = this.spawn('meta/MetaSelect2', {
            controller: this,
            query
        });
        const items = await list.getList();
        this.sendJson(items);
    }

    async resolveListParams () {
        const request = this.getPostParams();
        this.setMetaParams(request, 'list');
        if (request.master) {
            await this.setMasterMetaParams(request.master);
            if (!this.meta.master.model) {
                throw new BadRequest('Invalid master object');
            }
        }
        return this.security.resolveOnList(this.meta.view);
    }

    resolveListFilter (query) {
        query.setRelatedFilter(this.assignSecurityModelFilter.bind(this));
        const {attr, model} = this.meta.master;
        if (model) {
            return attr.relation.setQueryByModel(query, model);
        }
    }

    async actionRead () {
        const request = this.getPostParams();
        this.setMetaParams(request, 'edit');
        const model = await this.getReadModel(request.id);
        const security = this.security;
        await security.resolveOnRead(model);
        await security.resolveAttrsOnRead(model);
        const result = model.output({security});
        if (request.transitions) {
            result._transitions = await this.getModelTransitions(model);
        }
        this.sendJson(result);
    }

    async getModelTransitions (model) {
        const transit = this.createMetaTransit();
        await transit.resolve(model);
        return model.transitions.map(({name, title, hint, options}) => ({name, title, hint, options}));
    }

    async actionDefaults () {
        const request = this.getPostParams();
        this.setCreationMetaParams(request);
        await this.setMasterMetaParams(request.master);
        const model = this.meta.view.createModel(this.getSpawnConfig());
        await model.setDefaultValues();
        this.setDefaultMasterValue(model);
        await model.related.resolveEagers();
        await model.related.resolveEmbeddedModels();
        await model.resolveCalcValues();
        const security = this.security;
        await security.resolveOnCreate(model);
        await security.resolveAttrsOnCreate(model);
        this.sendJson(model.output({security}));
    }

    async actionCreate () {
        const request = this.getPostParams();
        this.setCreationMetaParams(request);
        if (this.meta.class.isAbstract()) {
            throw new BadRequest('Unable to instantiate abstract class');
        }
        this.checkCsrfToken();
        await this.setMasterMetaParams(request.master);
        const model = this.meta.view.createModel(this.getSpawnConfig());
        await model.setDefaultValues();
        this.setDefaultMasterValue(model);
        if (this.meta.view.isReadOnly()) {
            throw new Locked('Read-only state');
        }
        await this.security.resolveOnCreate(model);
        await this.security.resolveAttrsOnCreate(model);
        await this.save(request, model, 'create');
    }

    async actionUpdate () {
        const request = this.getPostParams();
        const meta = this.setMetaParams(request, 'edit');
        let model = await this.getReadModel(request.id);
        await this.security.resolveOnUpdate(model);
        const forbidden = !this.security.access.canUpdate();
        if (forbidden && meta.view.forbiddenView) {
            model = await this.getForbiddenViewModel(request.id);
        } else if (forbidden) {
            throw new Forbidden;
        }
        await this.security.resolveAttrsOnUpdate(model);
        if (model.isTransiting()) {
            throw new Locked('Transition in progress...');
        }
        if (model.isReadOnlyState()) {
            throw new Locked('Read-only state');
        }
        this.checkCsrfToken();
        await this.save(request, model, 'update');
    }

    async actionDelete () {
        this.checkCsrfToken();
        const request = this.getPostParams();
        this.setMetaParams(request);
        const model = await this.getReadModel(request.id);
        await this.security.resolveOnDelete(model);
        try {
            await model.delete();
        } catch (err) {
            if (err instanceof HttpException) {
                return this.sendJson([err.message, err.data?.params], err.status);
            }
            throw err;
        }
        this.sendText(model.getId());
    }

    async actionDeleteMultiple () {
        this.checkCsrfToken();
        const request = this.getPostParams();
        this.setMetaParams(request);
        if (!Array.isArray(request.ids)) {
            throw new BadRequest('Invalid ID array');
        }
        const objects = [], errors = [];
        for (const id of request.ids) {
            try {
                const model = await this.getReadModel(id);
                await this.security.resolveOnDelete(model);
                await model.delete();
                objects.push(id);
            } catch (err) {
                errors.push(this.prepareDeletionError(err, id));
            }
        }
        this.sendJson({objects, errors});
    }

    async actionTransit () {
        const request = this.getPostParams();
        const {transition} = request;
        if (!transition) {
            throw new BadRequest('No transition name specified');
        }
        this.checkCsrfToken();
        let meta = this.setMetaParams(request);
        let model = await this.getReadModel(request.id);
        await this.security.resolveOnUpdate(model);
        const forbidden = !this.security.access.canUpdate();
        if (forbidden && meta.view.forbiddenView) {
            model = await this.getForbiddenViewModel(request.id);
        }
        const transit = this.createMetaTransit();
        await transit.execute(model, transition);
        await model.hasError()
            ? this.handleModelError(model)
            : this.sendText(model.getId());
    }

    getReadModel (id) {
        return this.getModelByQuery(this.getModelQuery(id).withReadData());
    }

    getForbiddenViewModel (id) {
        this.meta.view = this.meta.view.forbiddenView;
        this.defaultViewAssigned = true;
        return this.getModel(id);
    }

    getModelQuery () {
        const query = super.getModelQuery(...arguments);
        if (this.defaultViewAssigned) {
            query.withStateView();
        }
        query.setRelatedFilter(this.assignSecurityModelFilter.bind(this));
        return query;
    }

    async assignSecurityModelFilter (query) {
        query.security = this.createMetaSecurity();
        if (await query.security.resolveOnList(query.view, {skipAccessException: true})) {
            await query.security.resolveAttrsOnList(query.view);
            return query.security.access.assignObjectFilter(query);
        }
        return query.where(['false']);
    }

    createMetaTransit () {
        return this.spawn('meta/MetaTransit', {
            controller: this,
            security: this.security
        });
    }

    setCreationMetaParams (data) {
        this.setClassMetaParams(data.class);
        this.meta.class = this.meta.class.getLastVersion();
        const view = this.meta.class.getView('create') || this.meta.class.getDefaultState()?.view;
        this.setViewMetaParams(data.view, view?.name);
        this.defaultViewAssigned = !data.view;
    }

    setMetaParams (data, defaultView) {
        this.setClassMetaParams(data.class);
        this.setViewMetaParams(data.view, defaultView);
        this.defaultViewAssigned = !data.view;
        return this.meta;
    }

    async setMasterMetaParams (data) {
        const master = this.meta.master;
        if (!data) {
            return master;
        }
        master.class = this.baseMeta.getClass(data.class);
        if (!master.class) {
            throw new BadRequest(`Master class not found: ${data.class}`);
        }
        master.view = data.view
            ? master.class.getView(data.view)
            : master.class;
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
            throw new BadRequest(`Meta class does not match master attribute reference class: ${master.attr.id}`);
        }
        if (!data.id) {
            master.model = master.view.createModel(this.getSpawnConfig());
            return master;
        }
        master.model = await master.view.createQuery(this.getSpawnConfig()).byId(data.id).one();
        if (!master.model) {
            throw new BadRequest(`Master object not found: ${data.id}.${master.view.id}`);
        }
        return master;
    }

    setDefaultMasterValue (model) {
        const master = this.meta.master;
        const attr = master.attr?.relation.refAttr;
        if (attr?.relation && !model.has(attr)) {
            model.set(attr, master.model.get(attr.relation.refAttrName));
            master.refAttr = attr;
        }
    }

    async save ({data, validateOnly}, model, action) {
        const excludes = this.security.getForbiddenAttrs(action);
        model.load(data, excludes);
        if (!await model.validate()) {
            return this.handleModelError(model);
        }
        if (validateOnly) {
            return this.sendStatus(Response.OK);
        }
        await model.forceSave();
        this.sendText(model.getId());
    }

    handleModelError (model) {
        const errors = model.getFirstErrorMap();
        this.send(this.translateMessageMap(errors), Response.BAD_REQUEST);
    }

    prepareDeletionError (err, id) {
        if (err instanceof HttpException) {
            return [err.message, err.data?.params];
        }
        this.log('error', `Deletion failed: ${id}.${this.meta.class.id}:`, err);
        return ['Object {id}: {err}', {id, err}];
    }
};
module.exports.init(module);

const BadRequest = require('areto/error/http/BadRequest');
const Forbidden = require('areto/error/http/Forbidden');
const HttpException = require('areto/error/HttpException');
const Locked = require('areto/error/http/Locked');
const Response = require('areto/web/Response');