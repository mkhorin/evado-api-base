/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('../component/BaseController');

module.exports = class FileController extends Base {

    constructor (config) {
        super(config);
        this.security = this.spawn('meta/MetaSecurity', {controller: this});
        this.meta = this.spawn('meta/MetaParams');
        this.meta.security = this.security;
        this.extraMeta = this.module.get('extraMeta');
    }

    async actionUpload () {
        const params = this.setMetaParams();
        await this.security.resolveOnCreate(params.view);
        const model = this.spawn('model/RawFile', {
            metaAttr: params.fileAttr
        });
        if (!await model.upload(this.req, this.res)) {
            return this.sendText(this.translate(model.getFirstError()), 400);
        }
        this.sendJson({
            id: model.getId(),
            size: model.get('size')
        });
    }

    async actionDownload () {
        this.setMetaParams();
        const model = await this.getModel(this.getQueryParam('id'));
        await this.security.resolveOnTitle(model);
        const storage = this.module.getFileStorage();
        const name = model.get('name') || model.getId();
        const file = storage.getPath(model.get('file'));
        if (!await FileHelper.getStat(file)) {
            throw new NotFound('File not found');
        }
        this.setHttpHeader(storage.getHeaders(name, model.get('_mime')));
        this.sendFile(file);
    }

    async actionThumbnail () {
        this.setMetaParams();
        const model = await this.getModel(this.getQueryParam('id'));
        await this.security.resolveOnTitle(model);
        let size = this.getQueryParam('s');
        if (!size) {
            let attr = this.meta.view.getAttr(this.meta.fileAttr.name) || this.meta.fileAttr;
            size = attr.getThumbnail();
        }
        const storage = this.module.getFileStorage();
        const fileName = model.get('file');
        const file = await storage.ensureThumbnail(size, fileName);
        if (!file) {
            throw new NotFound(`File not found: ${fileName}`);
        }
        const name = model.get('name') || model.getId();
        this.setHttpHeader(storage.thumbnail.getHeaders(name));
        this.sendFile(file);
    }

    setMetaParams (param = this.getQueryParam('v')) {
        const [viewName, className] = String(param).split('.');
        this.setClassMetaParams(className);
        this.setViewMetaParams(viewName);
        this.meta.fileAttr = this.meta.class.getFileBehaviorAttr();
        if (!this.meta.fileAttr) {
            throw new BadRequest(`File behavior attribute not found: ${param}`);
        }
        return this.meta;
    }
};
module.exports.init(module);

const BadRequest = require('areto/error/BadRequestHttpException');
const NotFound = require('areto/error/NotFoundHttpException');
const FileHelper = require('areto/helper/FileHelper');