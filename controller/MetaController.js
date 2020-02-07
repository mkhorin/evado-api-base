/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('../component/BaseController');

module.exports = class MetaController extends Base {

    static getConstants () {
        return {
            METHODS: {
                '*': 'post'
            }
        };
    }

    actionClass () {
        const metaClass = this.getClassFromRequest();
        this.sendJson(metaClass.data);
    }

    actionView () {
        const metaClass = this.getClassFromRequest();
        const metaView = metaClass.getView(this.getPostParam('view'));
        if (!metaView) {
            throw new NotFound('View not found');
        }
        this.sendJson(metaView.data);
    }

    actionListClassSelect () {
        this.sendJson(MetaSelectHelper.getLabelItems(this.docMeta.classes));
    }

    actionListViewSelect () {
        const metaClass = this.getClassFromRequest();
        this.sendJson(MetaSelectHelper.getLabelItems(metaClass.views));
    }

    actionListAttrSelect () {
        const metaClass = this.getClassFromRequest();
        const metaView = metaClass.getView(this.getPostParam('view')) || metaClass;
        this.sendJson(MetaSelectHelper.getLabelItems(metaView.attrs));
    }

    async actionListObjectSelect () {
        const metaClass = this.getClassFromRequest();
        const metaView = metaClass.getView(this.getPostParam('view')) || metaClass;
        const request = this.getPostParams();
        const query = metaView.find(this.getSpawnConfig());
        const result = await this.spawn('meta/MetaSelect2', {request, query}).getList();
        return this.sendJson(result);
    }

    actionListStateSelect () {
        const {states} = this.getClassFromRequest();
        this.sendJson(MetaSelectHelper.getLabelItems(states));
    }

    actionListTransitionSelect () {
        const {transitions} = this.getClassFromRequest();
        this.sendJson(MetaSelectHelper.getLabelItems(transitions));
    }

    getClassFromRequest () {
        const metaClass = this.docMeta.getClass(this.getPostParam('class'));
        if (metaClass) {
            return metaClass;
        }
        throw new NotFound('Class not found');
    }
};
module.exports.init(module);

const NotFound = require('areto/error/NotFoundHttpException');
const MetaSelectHelper = require('../component/MetaSelectHelper');