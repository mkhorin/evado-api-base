/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const {expect} = require('chai');
const MetaSelectHelper = require('../../../component/MetaSelectHelper');

describe('MetaSelectHelper', ()=> {

    it('getLabelText', ()=> {
        const item = {
            name: 'name',
            data: {}
        };
        expect(MetaSelectHelper.getLabelText(item)).to.eql('name');
        item.data.label = 'label';
        expect(MetaSelectHelper.getLabelText(item)).to.eql('label (name)');
    });
});