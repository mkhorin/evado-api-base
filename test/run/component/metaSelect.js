/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const {expect} = require('chai');
const Helper = require('../../../component/MetaSelectHelper');

describe('MetaSelectHelper', ()=> {

    it('getLabelText', ()=> {
        const item = {
            name: 'name',
            data: {}
        };
        expect(Helper.getLabelText(item)).to.eql('name');
        item.data.label = 'label';
        expect(Helper.getLabelText(item)).to.eql('label (name)');
    });
});