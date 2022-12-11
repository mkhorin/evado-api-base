/**
 * @copyright Copyright (c) 2021 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('../component/BaseController');

module.exports = class SignatureController extends Base {

    constructor (config) {
        super(config);
        this.meta = this.spawn('meta/MetaParams');
    }

    async actionData () {
        this.checkCsrfToken();
        const params = this.getPostParams();
        const behavior = await this.resolveSignatureBehavior(params);
        const data = await behavior.getHash();
        this.send(data);
    }

    async actionCreate () {
        this.checkCsrfToken();
        const params = this.getPostParams();
        const behavior = await this.resolveSignatureBehavior(params);
        const model = await behavior.createSignature(params);
        if (!await model.save()) {
            const error = model.getFirstError();
            throw new BadRequest(error?.toString());
        }
        this.send('Digital signature created');
    }

    async resolveSignatureBehavior (params) {
        this.setClassMetaParams(params.class);
        this.setViewMetaParams(params.view, 'edit');
        const model = await this.getModel(params.id);
        const behavior = model.createSignatureBehavior();
        if (!behavior) {
            throw new BadRequest('Invalid signature behavior');
        }
        const security = this.createMetaSecurity();
        if (!await behavior.canCreateSignature(security)) {
            throw new Forbidden('Creating a signature is forbidden');
        }
        if (await behavior.countUserSignatures(this.user)) {
            throw new BadRequest('Signature already exists');
        }
        return behavior;
    }

    getModelQuery () {
        return super.getModelQuery(...arguments).withStateView();
    }
};
module.exports.init(module);

const BadRequest = require('areto/error/http/BadRequest');
const Forbidden = require('areto/error/http/Forbidden');