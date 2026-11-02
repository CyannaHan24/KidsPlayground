import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialProducts,total,validateProducts} from '../src/model.js';
test('basket totals use integer CNY cents and quantities',()=>{assert.equal(total(initialProducts,{P001:2,P002:1,P003:3,P004:1}),4100);assert.equal(total(initialProducts,{}),0)});
test('catalog backup accepts reassigned products and rejects corrupt or duplicate records',()=>{const data=structuredClone(initialProducts);data[0].zh='苹果';data[0].en='Apple';assert.equal(validateProducts(data)[0].id,'P001');assert.throws(()=>validateProducts([...data,data[0]]));assert.throws(()=>validateProducts([{...data[0],price:-1}]));assert.throws(()=>validateProducts([{...data[0],price:1.2}]));assert.throws(()=>validateProducts([{...data[0],id:'https://example.com'}]));});
