import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as model from '../dist/model.js';
import * as training from '../dist/training.js';
const code=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
// A small DOM adapter exercises event handlers and persistence without a browser.
function app(initial=model.freshState(),hash='',environment={}){
 const storage=new Map([['zijlijn-v1',JSON.stringify(initial)]]),elements=new Map(),handlers={};
 const element=selector=>{if(!elements.has(selector))elements.set(selector,{innerHTML:'',textContent:'',value:'',style:{},dataset:{},open:false,classList:{values:new Set(),add(v){this.values.add(v)},remove(v){this.values.delete(v)},contains(v){return this.values.has(v)}},listeners:{},addEventListener(t,f){(this.listeners[t]??=[]).push(f)},setAttribute(){},showModal(){this.open=true;},close(){this.open=false;queueMicrotask(()=>{for(const f of this.listeners.close||[])f();});},focus(){},click(){}});return elements.get(selector);};
 const context=vm.createContext({...model,...training,console,URL,Blob,structuredClone,crypto,Date,JSON,Set,Map,FormData:class{constructor(form){this.data=form.data;}get(key){return this.data[key];}},navigator:{onLine:false},location:{hash},document:{documentElement:{},querySelector:element,querySelectorAll:()=>[],addEventListener:(type,fn)=>(handlers[type]??=[]).push(fn),visibilityState:'visible',createElement:()=>element('a')},window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>0,clearTimeout(){},setInterval(){},fetch:async()=>{throw Error('offline');},...environment});
 vm.runInContext(code,context);
 return {run:s=>vm.runInContext(s,context),stored:()=>JSON.parse(storage.get('zijlijn-v1')),element,emit:async(type,target)=>{for(const h of handlers[type]||[])await h({target,preventDefault(){}});}};
}
test('startschermen laden en trainingformulier bewaart drie links met correcte vrijdagtijd',async()=>{
 const a=app(undefined,'#training');assert.match(a.element('#app').innerHTML,/Eerste training maken/);
 a.run("actions['new-training']()");assert.match(a.element('#app').innerHTML,/training-form/);
 const links=['https://rinus.knvb.nl/exercise/id/1','https://rinus.knvb.nl/exercise/id/2','https://rinus.knvb.nl/exercise/id/3'];
 await a.emit('submit',{id:'training-form',data:{date:'2026-09-18',start:'17:45',field:'Veld 5',theme:'Aanvallen',link0:links[0],link1:links[1],link2:links[2],link3:''}});
 assert.equal(a.stored().trainings.length,1);assert.match(a.element('#app').innerHTML,/18:55/);assert.match(a.element('#app').innerHTML,/Open oefening in Rinus/);
 a.run("actions['training-clock']()");assert.equal(a.stored().trainings[0].run.status,'live');
 a.run("actions['training-clock']()");assert.equal(a.stored().trainings[0].run.startedAt,null);
 a.run("actions['confirm-training-next']()");assert.equal(a.stored().trainings[0].run.index,1);
});
test('samenvatting bewaart wijzigingen en blijft na heropenen en nieuwe wedstrijd beschikbaar',async()=>{
 const s=model.freshState();s.match.status='ended';s.match.opponent='Testclub';s.history.push({match:structuredClone(s.match),players:[]});
 const a=app(s);a.run("actions.summary()");
 await a.emit('input',{id:'summary-text',value:'Mooi samengespeeld!',hasAttribute:()=>false});
 assert.equal(a.stored().match.summary,'Mooi samengespeeld!');assert.equal(a.stored().history[0].match.summary,'Mooi samengespeeld!');
 a.run("actions.close();actions.summary()");assert.match(a.element('#dialog-content').innerHTML,/Mooi samengespeeld!/);
 a.run("actions['confirm-new']()");a.run(`actions.history({dataset:{id:${JSON.stringify(s.match.id)}}})`);assert.match(a.element('#dialog-content').innerHTML,/Testclub/);
 a.run(`actions.summary({dataset:{id:${JSON.stringify(s.match.id)}}})`);assert.match(a.element('#dialog-content').innerHTML,/Mooi samengespeeld!/);
});
test('scorecorrectie na afronden en herstellen werken door in archief',()=>{
 const s=model.freshState();s.match.status='ended';s.match.events.push({id:'g',type:'goal',at:0,side:'us'});s.history.push({match:structuredClone(s.match),players:[]});
 const a=app(s);a.run("actions['minus-us']()");assert.equal(model.score(a.stored().history[0].match).us,0);
 a.run("actions.undo()");assert.equal(model.score(a.stored().history[0].match).us,1);model.validateState(a.stored());
});
test('alleen bekijken van de samenvatting houdt de stand actueel tot na afronden en herladen',()=>{
 const s=model.freshState();s.match.status='live';s.match.events.push({id:'g',type:'goal',at:0,side:'us'});
 const a=app(s);a.run('actions.summary()');assert.match(a.element('#dialog-content').innerHTML,/Tussenstand: 1–0/);
 a.run("actions.close();actions['goal-us']();actions['confirm-finish']();actions.summary()");
 assert.match(a.element('#dialog-content').innerHTML,/Eindstand: 2–0/);
 const reloaded=app(a.stored());reloaded.run(`actions['confirm-new']();actions.summary({dataset:{id:${JSON.stringify(s.match.id)}}})`);
 assert.match(reloaded.element('#dialog-content').innerHTML,/Eindstand: 2–0/);
});
test('handmatig bericht blijft bij scorewijziging bewaard; opnieuw maken volgt daarna weer de score',async()=>{
 const s=model.freshState();s.match.status='live';
 const a=app(s);a.run('actions.summary()');
 await a.emit('input',{id:'summary-text',value:'Mijn eigen tekst',hasAttribute:()=>false});
 a.run("actions.close();actions['goal-us']();actions.summary()");assert.match(a.element('#dialog-content').innerHTML,/Mijn eigen tekst/);
 a.run("actions['confirm-summary']()");assert.match(a.element('#dialog-content').innerHTML,/Tussenstand: 1–0/);
 a.run("actions.close();actions['goal-us']();actions.summary()");assert.match(a.element('#dialog-content').innerHTML,/Tussenstand: 2–0/);
});
test('app registreert dezelfde worker-URL na een update en toont geen onnodige updatebadge',async()=>{
 const version=JSON.parse(readFileSync(new URL('../package.json',import.meta.url))).version;
 const activeUrl=`./sw.js?v=${version}`,registered=[];
 const reg={waiting:null,addEventListener(){},async update(){}};
 const sw={controller:{},ready:Promise.resolve(reg),addEventListener(){},async register(url){registered.push(url);if(url!==activeUrl)reg.waiting={postMessage(){}};return reg;}};
 const a=app(undefined,'',{navigator:{onLine:false,serviceWorker:sw},fetch:async()=>({ok:true,json:async()=>({version:'9.0.0'})})});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(registered[0],activeUrl);assert.doesNotMatch(a.element('#app-version').textContent,/Update/);
 a.run('navigator.onLine=true');await a.run('checkForUpdate(true)');
 assert.equal(registered.at(-1),'./sw.js?v=9.0.0');assert.match(a.element('#app-version').textContent,/Update/);
});
test('mislukte opslag blijft zichtbaar in plaats van een succesbericht',()=>{
 const a=app(undefined,'',{localStorage:{getItem:()=>null,setItem(){throw Error('quota');}}});
 a.run("state.players.push({id:'a',name:'Test',present:true});assign(0,'a')");
 assert.match(a.element('#toast').textContent,/Opslaan lukt niet/);
 assert.match(a.element('#app').innerHTML,/Maak een back-up/);
});
test('alle navigatieschermen renderen na herladen met training en wedstrijdgegevens',()=>{
 const s=model.freshState();const t=training.createTraining({date:'2026-09-18',links:['https://rinus.knvb.nl/exercise/id/1','https://rinus.knvb.nl/exercise/id/2','https://rinus.knvb.nl/exercise/id/3','']});s.trainings.push(t);s.selectedTrainingId=t.id;
 for(const tab of ['wedstrijd','opstelling','training','team']){const a=app(s,'#'+tab);assert.ok(a.element('#app').innerHTML.length>300);}
});
test('eigen goal telt direct, maker kiezen telt niet dubbel en verwijderen/herstellen bewaart de maker',()=>{
 const s=model.freshState();s.players=[{id:'a',name:'Ali',present:true},{id:'b',name:'Bo',present:true}];s.match.status='live';s.match.lineup[0]='b';s.match.initialLineup[0]='b';
 const a=app(s);a.run("actions['goal-us']()");assert.equal(model.score(a.stored().match).us,1);
 assert.match(a.element('#dialog-content').innerHTML,/Wie scoorde/);
 assert.ok(a.element('#dialog-content').innerHTML.indexOf('>Bo<')<a.element('#dialog-content').innerHTML.indexOf('>Ali<'));
 a.run("actions['assign-scorer']({dataset:{id:'b'}})");assert.equal(a.stored().match.events[0].scorerId,'b');assert.equal(model.score(a.stored().match).us,1);
 a.run("actions['minus-us']()");assert.equal(model.topScorers(a.stored()).players.length,0);
 a.run('actions.undo()');assert.equal(model.topScorers(a.stored()).players[0].goals,1);
 const restored=app(a.stored());restored.run('actions.undo()');assert.equal(model.score(restored.stored().match).us,0);
});
test('naam achteraf in oud archief aanvullen behoudt score en nieuwe wedstrijd',()=>{
 const s=model.freshState();const past=model.freshMatch();past.status='ended';past.events=[{id:'g',type:'goal',at:0,side:'us'}];s.history=[{match:past,players:[{id:'old',name:'Oud teamlid'}]}];
 const a=app(s,'#team');a.run(`actions.history({dataset:{id:${JSON.stringify(past.id)}}})`);
 assert.match(a.element('#dialog-content').innerHTML,/Maker kiezen/);
 a.run(`actions['edit-scorer']({dataset:{match:${JSON.stringify(past.id)},event:'g',history:'true'}});actions['assign-scorer']({dataset:{id:'old'}})`);
 const saved=a.stored();assert.equal(saved.history[0].match.events[0].scorerId,'old');assert.equal(saved.match.id,s.match.id);assert.equal(model.score(saved.history[0].match).us,1);
 assert.equal(model.topScorers(model.validateState(saved)).players[0].name,'Oud teamlid');
 a.run('render()');assert.match(a.element('#app').innerHTML,/Topscorers/);assert.match(a.element('#app').innerHTML,/Oud teamlid/);
});
test('overslaan of sluiten bewaart een onbekende goal; tegengoal opent geen keuze',()=>{
 const s=model.freshState();s.match.status='live';const a=app(s);
 a.run("actions['goal-us']();actions.close()");assert.equal(model.topScorers(a.stored()).unknown,1);
 a.run("actions['goal-us']();actions['assign-scorer']({dataset:{id:''}})");assert.equal(model.topScorers(a.stored()).unknown,2);
 a.run("actions['goal-them']()");assert.equal(a.element('#dialog').open,false);assert.equal(model.score(a.stored().match).them,1);
});
test('maker corrigeren via archief van huidige wedstrijd synchroniseert en is herstelbaar',()=>{
 const s=model.freshState();s.players=[{id:'a',name:'Ali',present:true}];s.match.status='ended';s.match.events=[{id:'g',type:'goal',at:0,side:'us'}];s.history=[{match:structuredClone(s.match),players:[]}];
 const a=app(s);a.run(`actions['edit-scorer']({dataset:{match:${JSON.stringify(s.match.id)},event:'g',history:'true'}});actions['assign-scorer']({dataset:{id:'a'}})`);
 const saved=model.validateState(a.stored());assert.equal(saved.history[0].match.events[0].scorerId,'a');assert.equal(model.topScorers(saved).players[0].goals,1);
 a.run('actions.close();actions.undo()');assert.equal(model.topScorers(a.stored()).unknown,1);assert.equal(model.score(a.stored().match).us,1);assert.equal(a.stored().history[0].match.events[0].scorerId,undefined);
});

const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('voorbespreking toont beide formaties alleen-lezen en bewaart wedstrijd ongewijzigd',async()=>{
 for(const formation of ['1-2-2-1','1-2-1-2']){
  const s=model.freshState();s.players=Array.from({length:8},(_,i)=>({id:String(i),name:'Speler '+i,present:true}));s.match.formation=formation;s.match.initialFormation=formation;s.match.lineup=s.players.slice(0,6).map(p=>p.id);s.match.initialLineup=[...s.match.lineup];
  const a=app(s);const before=JSON.stringify(a.stored());
  await a.run("actions['show-lineup']()");
  assert.equal(a.element('#dialog').open,true);assert.equal(a.element('#dialog').classList.contains('presentation'),true);
  const html=a.element('#dialog-content').innerHTML;for(let i=0;i<8;i++)assert.match(html,new RegExp('Speler '+i));
  assert.match(html,new RegExp(formation));assert.doesNotMatch(html,/data-action="(?:position|bench|assign)"/);
  a.run('actions.close()');assert.equal(a.run('presentationOpen'),false);assert.equal(a.element('#dialog').classList.contains('presentation'),false);assert.equal(JSON.stringify(a.stored()),before);
 }
});
test('voorbespreking houdt scherm wakker en sluit ook zonder fullscreen-ondersteuning',async()=>{
 let requests=0,releases=0;const lock={addEventListener(){},async release(){releases++}};
 const a=app(undefined,'',{navigator:{onLine:false,wakeLock:{async request(){requests++;return lock}}}});
 a.run("document.documentElement.requestFullscreen=async()=>{throw Error('unsupported')}");
 await a.run("actions['show-lineup']()");await settle();assert.equal(requests,1);assert.equal(a.element('#dialog').open,true);
 a.run('dialog.close()');await settle();assert.equal(releases,1);assert.equal(a.run('presentationOpen'),false);
 a.run('actions.summary()');assert.equal(a.element('#dialog').classList.contains('presentation'),false);
});
test('sluiten voorbespreking laat actieve wedstrijdklok wakker',async()=>{
 let releases=0;const s=model.freshState();s.match.status='live';s.match.startedAt=Date.now();
 const a=app(s,'',{navigator:{onLine:false,wakeLock:{async request(){return {addEventListener(){},async release(){releases++}}}}}});
 await settle();await a.run("actions['show-lineup']()");a.run('actions.close()');await settle();assert.equal(releases,0);
});
test('late schermvergrendeling wordt vrijgegeven na snel sluiten',async()=>{
 let resolve,releases=0,requests=0;
 const a=app(undefined,'',{navigator:{onLine:false,wakeLock:{request(){requests++;return new Promise(r=>resolve=r)}}}});
 await a.run("actions['show-lineup']()");a.run('keepAwake();actions.close()');assert.equal(requests,1);
 resolve({addEventListener(){},async release(){releases++}});await settle();assert.equal(releases,1);assert.equal(a.run('wakeLock'),null);
});

test('voorbespreking gebruikt document voor fullscreen en ruimt alleen eigen fullscreen op',async()=>{
 const a=app();a.run('document.documentElement.requestFullscreen=async()=>{document.fullscreenElement=document.documentElement};document.exitFullscreen=async()=>{document.fullscreenElement=null}');
 await a.run("actions['show-lineup']()");assert.equal(a.run('presentationFullscreen'),true);
 a.run('actions.close()');assert.equal(a.run('document.fullscreenElement'),null);
 a.run('document.fullscreenElement=document.documentElement');await a.run("actions['show-lineup']()");a.run('actions.close()');assert.equal(a.run('document.fullscreenElement===document.documentElement'),true);
});

test('voorbespreking blijft bovenop na asynchroon openen van native fullscreen',async()=>{
 const a=app();const order=[];const d=a.element('#dialog'),show=d.showModal.bind(d);d.showModal=()=>{order.push('dialog');show()};
 a.run('document.documentElement.requestFullscreen=async()=>{document.fullscreenElement=document.documentElement}');
 await a.run("actions['show-lineup']()");assert.deepEqual(order,['dialog','dialog']);assert.equal(d.open,true);assert.equal(a.run('presentationOpen'),true);
});

test('historie verwijderen vraagt bevestiging en past topscorers blijvend aan',()=>{
 const s=model.freshState();s.players=[{id:'a',name:'Ali',present:true}];
 const past=model.freshMatch();past.status='ended';past.opponent='Testclub';past.events=[{id:'g',type:'goal',side:'us',at:0,scorerId:'a'}];s.history=[{match:past,players:s.players}];
 const a=app(s,'#team'),before=JSON.stringify(a.stored());
 a.run(`actions.history({dataset:{id:'${past.id}'}})`);assert.match(a.element('#dialog-content').innerHTML,/Wedstrijd verwijderen/);
 a.run(`actions['delete-history']({dataset:{id:'${past.id}'}})`);assert.match(a.element('#dialog-content').innerHTML,/Testclub/);assert.equal(JSON.stringify(a.stored()),before);
 a.run('actions.close()');assert.equal(JSON.stringify(a.stored()),before);
 a.run(`actions['delete-history']({dataset:{id:'${past.id}'}});actions['confirm-delete-history']({dataset:{id:'${past.id}'}})`);
 assert.equal(a.stored().history.length,0);assert.equal(model.topScorers(a.stored()).players.length,0);assert.deepEqual(a.stored().match,s.match);
 const reload=app(a.stored());assert.equal(reload.stored().history.length,0);model.validateState(reload.stored());
});
test('laatst afgeronde wedstrijd verwijderen wist ook de huidige kopie en herstelacties',()=>{
 const s=model.freshState();s.players=[{id:'a',name:'Ali',present:true}];s.match.status='ended';s.match.events=[{id:'g',type:'goal',side:'us',at:0,scorerId:'a'}];s.history=[{match:structuredClone(s.match),players:s.players}];
 const a=app(s,'#team');a.run("actions['minus-us']()");assert.equal(a.stored().undoHistory.length,1);
 a.run(`actions['delete-history']({dataset:{id:'${s.match.id}'}})`);assert.match(a.element('#dialog-content').innerHTML,/wedstrijdscherm/);
 a.run(`actions['confirm-delete-history']({dataset:{id:'${s.match.id}'}});actions.undo()`);
 assert.equal(a.stored().history.length,0);assert.equal(a.stored().match.status,'ready');assert.notEqual(a.stored().match.id,s.match.id);assert.equal(a.stored().undoHistory.length,0);assert.equal(model.topScorers(a.stored()).players.length,0);assert.deepEqual(a.stored().players,s.players);model.validateState(a.stored());
});
test('oude historie verwijderen raakt lopende wedstrijd en training niet',()=>{
 const s=model.freshState();s.match.status='live';s.match.startedAt=Date.now();const old=model.freshMatch();old.status='ended';s.history=[{match:old,players:[]}];
 const t=training.createTraining({date:'2026-09-25',links:['https://rinus.knvb.nl/exercise/id/1','https://rinus.knvb.nl/exercise/id/2','https://rinus.knvb.nl/exercise/id/3','']});s.trainings=[t];
 const a=app(s);a.run(`actions['confirm-delete-history']({dataset:{id:'${old.id}'}})`);assert.deepEqual(a.stored().match,s.match);assert.deepEqual(a.stored().trainings,s.trainings);
 const before=JSON.stringify(a.stored());a.run(`actions['confirm-delete-history']({dataset:{id:'${old.id}'}})`);assert.equal(JSON.stringify(a.stored()),before);
});
test('wedstrijdscherm houdt score en bankwissels direct bereikbaar zonder tweede opstelling',()=>{
 const s=model.freshState();s.players=[{id:'a',name:'Ali',present:true},{id:'b',name:'Bo',present:true}];s.match.lineup[0]='a';s.match.initialLineup[0]='a';s.match.status='live';s.match.half=2;
 const a=app(s),html=a.element('#app').innerHTML;
 assert.doesNotMatch(html,/data-action="position"|id="formation"|Speeltijd per speler/);assert.match(html,/data-action="bench"/);assert.equal((html.match(/data-action="finish"/g)||[]).length,1);
 a.run("actions.bench({dataset:{id:'b'}});actions.assign({dataset:{index:'0',id:'b'}})");assert.equal(a.stored().match.lineup[0],'b');
 a.run("actions['goal-them']()");assert.equal(model.score(a.stored().match).them,1);
 a.run("tab='opstelling';render()");assert.match(a.element('#app').innerHTML,/data-action="position"/);assert.match(a.element('#app').innerHTML,/Speeltijd per speler/);
});
test('historie verwijderen houdt de grens tussen geback-upte en nieuwe wedstrijden correct',()=>{
 for(const index of [0,5]){
  const s=model.freshState();s.backupAt=Date.now();s.backupMatches=3;s.history=Array.from({length:6},()=>({match:{...model.freshMatch(),status:'ended'},players:[]}));
  assert.equal(model.backupDue(s),true);model.deleteHistory(s,s.history[index].match.id);
  assert.equal(s.backupMatches,index===0?2:3);assert.equal(model.backupDue(s),index===0);
 }
});
