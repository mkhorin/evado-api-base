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
        if (!await this.user.can('moduleApiBaseUpload')) {
            throw new Forbidden;
        }
        this.setMetaParams();
        const model = this.meta.view.createModel(this.getSpawnConfig());
        const fileBehavior = this.createFileBehavior(model);
        const raw = this.spawn(fileBehavior.getRawFile(), {fileBehavior});
        if (await raw.isLimitReached(this.user)) {
            return this.sendText(this.translate('Upload limit reached'), 409);
        }
        if (!await raw.upload(this.req, this.res)) {
            return this.sendText(this.translate(raw.getFirstError()), 400);
        }
        this.sendJson({
            id: raw.getId(),
            mime: raw.getMime(),
            size: raw.getSize()
        });
    }

    async actionDownload () {
        this.setMetaParams();
        const model = await this.getModel(this.getQueryParam('id'));
        await this.security.resolveOnTitle(model);
        const fileBehavior = this.createFileBehavior(model);
        const storage = fileBehavior.getStorage();
        const filename = fileBehavior.getFilename();
        const file = storage.getPath(filename);
        if (!await FileHelper.getStat(file)) {
            throw new NotFound(`File not found: ${filename}`);
        }
        const name = fileBehavior.getName() || model.getId();
        this.setHttpHeader(storage.getHeaders(name, fileBehavior.getMime()));
        this.sendFile(file);
    }

    async actionThumbnail () {
        this.setMetaParams();
        const model = await this.getModel(this.getQueryParam('id'));
        await this.security.resolveOnTitle(model);
        const fileBehavior = this.createFileBehavior(model);
        const storage = fileBehavior.getStorage();
        const name = fileBehavior.getName() || model.getId();
        const filename = fileBehavior.getFilename();
        const size = this.getQueryParam('s') || this.meta.view.options.thumbnail;
        if (size) {
            const file = await storage.ensureThumbnail(size, filename);
            if (!file) {
                throw new NotFound(`File not found: ${filename}`);
            }
            this.setHttpHeader(storage.thumbnail.getHeaders(name));
            return this.sendFile(file);
        }
        const file = storage.getPath(filename);
        if (!await FileHelper.getStat(file)) {
            throw new NotFound(`File not found: ${filename}`);
        }
        this.setHttpHeader(storage.getHeaders(name, fileBehavior.getMime()));
        this.sendFile(file);
    }

    setMetaParams () {
        this.setClassMetaParams(this.getQueryParam('c'));
        this.setViewMetaParams(this.getQueryParam('v'));
        return this.meta;
    }

    createFileBehavior (model) {
        if (!this.meta.class.FileBehaviorConfig) {
            throw new BadRequest(`File behavior not found: ${this.meta.class.id}`);
        }
        return model.createBehavior(this.meta.class.FileBehaviorConfig);
    }
};
module.exports.init(module);

const BadRequest = require('areto/error/http/BadRequest');
const NotFound = require('areto/error/http/NotFound');
const Forbidden = require('areto/error/http/Forbidden');
const FileHelper = require('areto/helper/FileHelper');