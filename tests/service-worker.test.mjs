import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const version=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
const code=readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8');
test('versiecontrole passeert offline-cache, assets gebruiken eigen releasecache',async()=>{
 const handlers={}, calls=[];
 vm.runInNewContext(code,{URL,self:{location:{href:'https://example.test/Voetbal/sw.js',origin:'https://example.test'},addEventListener:(t,f)=>handlers[t]=f},caches:{open:async n=>{calls.push(n);return {match:async()=> 'cached asset'};}},fetch:async()=> 'network'});
 let response;
 handlers.fetch({request:{method:'GET',url:'https://example.test/Voetbal/release.json?t=123'},respondWith:()=>assert.fail('Release mag niet uit de offline-cache komen')});
 handlers.fetch({request:{method:'GET',url:'https://example.test/Voetbal/app.js'},respondWith:p=>response=p});
 assert.equal(await response,'cached asset');assert.deepEqual(calls,['zijlijn-v'+version]);
});
test('een nieuwe worker activeert alleen op verzoek, niet tijdens installatie',async()=>{
 const handlers={};let activations=0;const requests=[];
 vm.runInNewContext(code,{URL,Request:class{constructor(path,options){this.path=path;this.cache=options.cache;}},self:{addEventListener:(t,f)=>handlers[t]=f,skipWaiting:()=>{activations++;return Promise.resolve();}},caches:{open:async()=>({addAll:async assets=>requests.push(...assets)})}});
 let completion;
 handlers.install({waitUntil:p=>completion=p});await completion;assert.equal(activations,0);assert.ok(requests.some(r=>r.path==='./training.js'));assert.ok(requests.some(r=>r.path==='./persistence.js'));assert.ok(requests.every(r=>r.cache==='reload'));
 handlers.message({data:{type:'ACTIVATE_UPDATE'},waitUntil:p=>completion=p});await completion;assert.equal(activations,1);
});
test('een gedeelde app-link met query opent offline zonder onbekende pagina’s als wedstrijd te tonen',async()=>{
 const handlers={},origin='https://example.test',root=origin+'/Voetbal/',cached={body:'offline shell'};
 const cache={match:async(request,options)=>{const url=new URL(typeof request==='string'?request:request.url,root);if(options?.ignoreSearch)url.search='';return [root,root+'index.html'].includes(url.href)?cached:undefined;}};
 vm.runInNewContext(code,{URL,self:{location:{href:root+'sw.js',origin},addEventListener:(t,f)=>handlers[t]=f},caches:{open:async()=>cache},fetch:async()=>{throw Error('offline');}});
 const request=async(path,mode)=>{let response;handlers.fetch({request:{method:'GET',mode,url:root+path},respondWith:p=>response=p});return response;};
 assert.equal(await request('?utm_source=ouders','navigate'),cached);
 assert.equal(await request('index.html?from=app','navigate'),cached);
 await assert.rejects(request('onbekend?from=app','navigate'),/offline/);
 await assert.rejects(request('app.js?v=ander','cors'),/offline/);
});
