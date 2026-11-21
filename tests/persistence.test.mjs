import test from 'node:test';
import assert from 'node:assert/strict';
import {createPersistence} from '../dist/persistence.js';

test('na een mislukte schrijfactie bevat het herstelbestand de laatst bewaarde wijzigingen',()=>{
 let saved='{"goals":0}',canSave=true;
 const p=createPersistence(()=>({getItem:()=>saved,setItem:(_,v)=>{if(!canSave)throw Error('quota');saved=v;}}),'state');
 p.load({},v=>v);
 assert.ok(p.save({goals:1}));
 canSave=false;assert.equal(p.save({goals:2}),false);
 assert.equal(p.recovery(),'{"goals":1}');
});

test('een lege opgeslagen waarde is beschadigd; niet stil vervangen door een leeg team',()=>{
 let saved='',writes=0;
 const p=createPersistence(()=>({getItem:()=>saved,setItem:(_,v)=>{writes++;saved=v;}}),'state');
 p.load({},v=>v);
 assert.ok(p.error);
 assert.equal(p.save({}),false);
 assert.equal(writes,0);assert.equal(p.recovery(),'');
});
