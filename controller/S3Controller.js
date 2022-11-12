/**
 * @copyright Copyright (c) 2021 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('./FileController');

module.exports = class S3Controller extends Base {

    async actionUpload () {
        await this.canUpload();
        this.setMetaParams();
        const model = this.meta.view.createModel(this.getSpawnConfig());
        const behavior = this.createFileBehavior(model);
        const raw = this.spawn(behavior.getRawClass(), {
            customRule: behavior.rule
        });
        raw.setData(this.getPostParams());
        if (!await raw.save()) {
            return this.sendText(this.translate(raw.getFirstError()), Response.BAD_REQUEST);
        }
        try {
            const id = raw.getId();
            const url = await raw.getSignedUploadUrl();
            this.sendJson({id, url});
        } catch (err) {
            this.handleError(err, raw.getStorage());
        }
    }

    async actionDownload () {
        this.setMetaParams();
        const {id} = this.getQueryParams();
        const model = await this.getModel(id);
        await this.security.resolveOnTitle(model);
        const behavior = this.createFileBehavior(model);
        try {
            const url = await behavior.getSignedDownloadUrl();
            this.sendText(url);
        } catch (err) {
            this.handleError(err, behavior.getStorage());
        }
    }

    actionThumbnail () {
        this.sendStatus(Response.METHOD_NOT_ALLOWED);
    }

    handleError (data, storage) {
        if (storage.isConnectionError(data)) {
            return this.handleConnectionError(...arguments);
        }
        throw data;
    }

    handleConnectionError (data) {
        this.log('error', data);
        this.send('Service is unavailable. Try again later', Response.SERVICE_UNAVAILABLE);
    }
};
module.exports.init(module);

const Response = require('areto/web/Response');