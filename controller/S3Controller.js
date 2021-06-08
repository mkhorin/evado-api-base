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
        if (!await raw.upload(this.getPostParams())) {
            return this.sendText(this.translate(raw.getFirstError()), 400);
        }
        const id = raw.getId();
        const url = await raw.getSignedUploadUrl();
        this.sendJson({id, url});
    }

    async actionDownload () {
        this.setMetaParams();
        const model = await this.getModel(this.getQueryParam('id'));
        await this.security.resolveOnTitle(model);
        const behavior = this.createFileBehavior(model);
        const url = await behavior.getSignedDownloadUrl();
        this.sendText(url);
    }

    actionThumbnail () {
        throw new BadRequest;
    }
};
module.exports.init(module);

const BadRequest = require('areto/error/http/BadRequest');