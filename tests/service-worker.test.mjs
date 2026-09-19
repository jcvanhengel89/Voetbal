import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8');
test('versiecontrole passeert offline-cache, assets gebruiken eigen releasecache',async()=>{
 const handlers={}, calls=[];
 vm.runInNewContext(code,{URL,self:{location:{href:'https://example.test/Voetbal/sw.js',origin:'https://example.test'},addEventListener:(t,f)=>handlers[t]=f},caches:{open:async n=>{calls.push(n);return {match:async()=> 'cached asset'};}},fetch:async()=> 'network'});
 let response;
 handlers.fetch({request:{method:'GET',url:'https://example.test/Voetbal/release.json?t=123'},respondWith:()=>assert.fail('Release mag niet uit de offline-cache komen')});
 handlers.fetch({request:{method:'GET',url:'https://example.test/Voetbal/app.js'},respondWith:p=>response=p});
 assert.equal(await response,'cached asset');assert.deepEqual(calls,['zijlijn-v1.4.0']);
});
test('een nieuwe worker activeert alleen op verzoek, niet tijdens installatie',async()=>{
 const handlers={};let activations=0;const requests=[];
 vm.runInNewContext(code,{URL,Request:class{constructor(path,options){this.path=path;this.cache=options.cache;}},self:{addEventListener:(t,f)=>handlers[t]=f,skipWaiting:()=>{activations++;return Promise.resolve();}},caches:{open:async()=>({addAll:async assets=>requests.push(...assets)})}});
 let completion;
 handlers.install({waitUntil:p=>completion=p});await completion;assert.equal(activations,0);assert.ok(requests.some(r=>r.path==='./training.js'));assert.ok(requests.every(r=>r.cache==='reload'));
 handlers.message({data:{type:'ACTIVATE_UPDATE'},waitUntil:p=>completion=p});await completion;assert.equal(activations,1);
});
